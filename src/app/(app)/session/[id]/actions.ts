"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { revalidatePath } from "next/cache";
import { maybeAdvanceWeek } from "@/lib/data/week-progression";

/**
 * Persist a single logged set. No-op in demo mode so UI keeps working.
 * Returns true on success, false on any error.
 */
export async function logSetAction(input: {
  sessionId: string;
  setId: string;
  weight: number;
  reps: number;
  rpe: number | null;
}): Promise<{ ok: boolean }> {
  if (!SUPABASE_ENABLED) return { ok: true };

  const supabase = await createClient();
  if (!supabase) return { ok: false };

  const { error } = await supabase
    .from("session_sets")
    .update({
      logged_weight: input.weight,
      logged_reps: input.reps,
      logged_rpe: input.rpe,
      logged_at: new Date().toISOString(),
    })
    .eq("id", input.setId);

  if (error) return { ok: false };

  // If this was the first logged set, flip the session from
  // "scheduled" → "active".
  await supabase
    .from("sessions")
    .update({ status: "active", started_at: new Date().toISOString() })
    .eq("id", input.sessionId)
    .eq("status", "scheduled");

  return { ok: true };
}

/**
 * Mark a session as completed and award Reps. Returns the amount
 * awarded (0 in demo mode or if already awarded / not yet completed).
 */
export async function completeSessionAction(sessionId: string): Promise<{
  ok: boolean;
  repsAwarded: number;
}> {
  if (!SUPABASE_ENABLED) return { ok: true, repsAwarded: 250 };

  const supabase = await createClient();
  if (!supabase) return { ok: false, repsAwarded: 0 };

  const { error } = await supabase
    .from("sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) return { ok: false, repsAwarded: 0 };

  const { data: awarded } = await supabase.rpc("award_session_reps", {
    p_session_id: sessionId,
  });

  // After completing this session, see if the week is done.
  // If yes, generate next week (idempotent — bails if not done).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await maybeAdvanceWeek(user.id);
  }

  // Revalidate views that show member stats / today card / feed.
  revalidatePath("/dashboard");
  revalidatePath("/coaching");
  revalidatePath("/reps");

  return { ok: true, repsAwarded: Number(awarded ?? 0) };
}

/**
 * Member's response to an active adaptive_v0 modifier: accept it (run
 * the adapted session) or keep the original. Updates
 * `hrv_session_modifiers.accepted_by_member` and revalidates the
 * session page so applyAdaptationToSession sees the new state.
 *
 * Auth model: read the authenticated member via the RLS-respecting
 * client (cookies-backed), then perform the update with the
 * service-role client narrowed by an explicit
 * `member_id = <auth-uid>` filter. Two reasons for this split:
 *   - 0032 only granted SELECT on hrv_session_modifiers to members;
 *     an UPDATE policy would require a follow-up migration.
 *   - The explicit filter in the update is stricter than a column
 *     check would be — no risk of leaking other members' rows via
 *     a malicious modifier id.
 *
 * Returns `{ ok: true }` on success; `{ ok: false, reason }` on auth
 * failure, missing row, or DB error. The caller's optimistic UI
 * rolls back on `!ok`.
 */
export async function setAdaptationResponseAction(input: {
  modifierId: string;
  sessionId: string;
  accepted: boolean;
}): Promise<{ ok: boolean; reason?: string }> {
  if (!SUPABASE_ENABLED) return { ok: true };

  // RLS-respecting client just to read the authed user id.
  const authClient = await createClient();
  if (!authClient) return { ok: false, reason: "no-supabase" };
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  // Service-role client for the write — narrowed by an explicit
  // member_id filter so we can only ever touch the caller's own row.
  const svc = createServiceClient();
  const { error, count } = await svc
    .from("hrv_session_modifiers")
    .update(
      { accepted_by_member: input.accepted },
      { count: "exact" }
    )
    .eq("id", input.modifierId)
    .eq("member_id", user.id)
    .eq("reason", "adaptive_v0");

  if (error) {
    console.error(
      "[adaptive] setAdaptationResponseAction:",
      error.message
    );
    return { ok: false, reason: "db-error" };
  }
  if ((count ?? 0) === 0) {
    // Nothing updated — either the modifier id is wrong or belongs
    // to someone else. Caller doesn't need to distinguish.
    return { ok: false, reason: "not-found" };
  }

  // Re-render the session page so applyAdaptationToSession picks up
  // the new accepted_by_member value.
  revalidatePath(`/session/${input.sessionId}`);
  return { ok: true };
}
