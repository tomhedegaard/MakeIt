"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { getProvider } from "@/lib/hrv/wearables/registry";

/**
 * HRV wearable connect/disconnect server actions.
 *
 * Called by the `/hrv` and `/settings` pages to manage a member's
 * wearable OAuth connections (provider-agnostic via the registry).
 *
 * Ownership model: `hrv_wearable_connections`' member RLS policy is
 * select-only, so mutations go through `createServiceClient()` (which
 * bypasses RLS). Every mutating action therefore resolves the current
 * member via the SSR session client and filters explicitly on
 * `member_id` so a member can never touch another member's rows.
 */

/** Name of the OAuth `state` cookie. Read by the Task 7 callback route. */
const OAUTH_STATE_COOKIE = "hrv_oauth_state";

type ActionResult = { ok: true } | { ok: false; error: string };

type StartConnectResult =
  | { ok: true; authUrl: string }
  | { ok: false; error: string };

/**
 * Resolves the current member id from the SSR session.
 * Returns null in demo mode or when there is no authenticated user.
 */
async function getCurrentMemberId(): Promise<string | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

/**
 * Derives the request origin (`<protocol>://<host>`) from the incoming
 * request headers. We read `host` plus `x-forwarded-proto` (set by the
 * Vercel/host proxy) rather than accepting an `origin` argument from the
 * client, so the redirect URI cannot be spoofed by the caller — it must
 * match the host the request actually arrived on.
 */
async function getRequestOrigin(): Promise<string | null> {
  const h = await headers();
  const host = h.get("host");
  if (!host) return null;
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  return `${proto}://${host}`;
}

/**
 * Begins a wearable OAuth connect flow.
 *
 * Generates a CSRF `state` token, persists it (with the provider) in the
 * `hrv_oauth_state` cookie per the Task 7 contract, and returns the
 * provider authorize URL for the client to redirect to.
 *
 * Demo mode: returns `{ ok: false, error: 'demo_mode' }`.
 */
export async function startWearableConnect(
  provider: string,
): Promise<StartConnectResult> {
  if (!SUPABASE_ENABLED) return { ok: false, error: "demo_mode" };

  const providerImpl = getProvider(provider);
  if (!providerImpl) {
    return { ok: false, error: "unsupported_provider" };
  }

  const memberId = await getCurrentMemberId();
  if (!memberId) return { ok: false, error: "no_session" };

  const origin = await getRequestOrigin();
  if (!origin) return { ok: false, error: "no_origin" };

  const state = crypto.randomUUID();

  const cookieStore = await cookies();
  cookieStore.set(
    OAUTH_STATE_COOKIE,
    JSON.stringify({ state, provider: providerImpl.id }),
    {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    },
  );

  const redirectUri = `${origin}/api/wearables/${provider}/callback`;

  return { ok: true, authUrl: providerImpl.getAuthUrl(state, redirectUri) };
}

/**
 * Marks a wearable connection as revoked.
 *
 * Uses the service client (member RLS is select-only) with an explicit
 * `member_id` filter so a member can only revoke their own connection.
 */
export async function disconnectWearable(
  connectionId: string,
): Promise<ActionResult> {
  if (!SUPABASE_ENABLED) return { ok: true };

  const memberId = await getCurrentMemberId();
  if (!memberId) return { ok: false, error: "no_session" };

  const service = createServiceClient();
  const { error } = await service
    .from("hrv_wearable_connections")
    .update({ status: "revoked" })
    .eq("id", connectionId)
    .eq("member_id", memberId);

  if (error) return { ok: false, error: "update_failed" };

  revalidatePath("/hrv");
  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Makes the given connection the member's primary wearable.
 *
 * The table has a partial unique index allowing only one
 * `is_primary = true` per member, so we clear-then-set: first set ALL
 * of the member's connections to `is_primary = false`, then set the
 * chosen one to `true`. This ordering can never transiently violate the
 * index. Both statements filter on `member_id`; the chosen connection is
 * verified to belong to the member before any write.
 */
export async function setPrimaryConnection(
  connectionId: string,
): Promise<ActionResult> {
  if (!SUPABASE_ENABLED) return { ok: true };

  const memberId = await getCurrentMemberId();
  if (!memberId) return { ok: false, error: "no_session" };

  const service = createServiceClient();

  // Verify the chosen connection belongs to this member.
  const { data: connection, error: lookupError } = await service
    .from("hrv_wearable_connections")
    .select("id")
    .eq("id", connectionId)
    .eq("member_id", memberId)
    .maybeSingle();

  if (lookupError) return { ok: false, error: "lookup_failed" };
  if (!connection) return { ok: false, error: "not_found" };

  // Clear: demote every connection owned by this member.
  const { error: clearError } = await service
    .from("hrv_wearable_connections")
    .update({ is_primary: false })
    .eq("member_id", memberId);

  if (clearError) return { ok: false, error: "update_failed" };

  // Set: promote the chosen connection.
  const { error: setError } = await service
    .from("hrv_wearable_connections")
    .update({ is_primary: true })
    .eq("id", connectionId)
    .eq("member_id", memberId);

  if (setError) return { ok: false, error: "update_failed" };

  revalidatePath("/hrv");
  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Enables or disables menstrual-cycle tracking for the current member,
 * upserting their `hrv_settings` row.
 */
export async function setCycleTracking(
  enabled: boolean,
): Promise<ActionResult> {
  if (!SUPABASE_ENABLED) return { ok: true };

  const memberId = await getCurrentMemberId();
  if (!memberId) return { ok: false, error: "no_session" };

  const service = createServiceClient();
  const { error } = await service
    .from("hrv_settings")
    .upsert(
      { member_id: memberId, cycle_tracking_enabled: enabled },
      { onConflict: "member_id" },
    );

  if (error) return { ok: false, error: "update_failed" };

  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Enables or disables the V2.4 session readiness nudge for the
 * current member, upserting their `hrv_settings` row.
 */
export async function setSessionSuggestionEnabled(
  enabled: boolean,
): Promise<ActionResult> {
  if (!SUPABASE_ENABLED) return { ok: true };

  const memberId = await getCurrentMemberId();
  if (!memberId) return { ok: false, error: "no_session" };

  const service = createServiceClient();
  const { error } = await service
    .from("hrv_settings")
    .upsert(
      { member_id: memberId, session_suggestion_enabled: enabled },
      { onConflict: "member_id" },
    );

  if (error) return { ok: false, error: "update_failed" };

  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Marks the calling member's milestone row as seen, so the /hrv
 * toast disappears on the next page load. No-op in demo mode.
 * RLS members_own_streak_events covers this — the service-role
 * client is therefore overkill but matches the pattern in this
 * file (which always uses createServiceClient for mutations and
 * filters on member_id explicitly).
 */
export async function markHrvMilestoneSeen(
  milestone: number,
): Promise<ActionResult> {
  if (!SUPABASE_ENABLED) return { ok: true };

  const memberId = await getCurrentMemberId();
  if (!memberId) return { ok: false, error: "no_session" };

  const service = createServiceClient();
  const { error } = await service
    .from("hrv_streak_events")
    .update({ seen_at: new Date().toISOString() })
    .eq("member_id", memberId)
    .eq("milestone", milestone)
    .is("seen_at", null);

  if (error) return { ok: false, error: "update_failed" };

  revalidatePath("/hrv");
  return { ok: true };
}
