/**
 * Invite-code access — connected mode only.
 *
 * Validate via `is_invite_valid` (granted to anon).
 * Consume via `consume_invite` SECURITY DEFINER (0059) when present.
 * If that RPC is not live yet, fall back to the PR #41 service-role
 * UPDATE on `invite_codes` (no client policies).
 *
 * Never call `consumeInviteForUser` from a demo path.
 * Never import this module from a client component (`server-only`).
 *
 * Spec: docs/superpowers/specs/2026-09-01-invite-signup-bypass.md
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  normalizeInviteCode,
  type InviteRpcResult,
} from "@/lib/invite-gate";

/** PostgREST / Postgres: function not in the schema cache yet. */
function isMissingRpc(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  if (code === "PGRST202" || code === "42883") return true;
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("could not find the function") ||
    message.includes("does not exist")
  );
}

export async function fetchInviteValidity(
  rawCode: string,
): Promise<InviteRpcResult> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("is_invite_valid", {
    p_code: normalizeInviteCode(rawCode),
  });

  if (error) return null;
  if (typeof data !== "boolean") return null;
  return data;
}

/**
 * `true` / `false` after 0059. `null` if the RPC is missing or down
 * so callers can keep the 7-day window instead of locking people out.
 */
export async function fetchInviteAdmitted(): Promise<InviteRpcResult> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc(
    "is_current_user_invite_admitted",
  );

  if (error) return null;
  if (typeof data !== "boolean") return null;
  return data;
}

export async function consumeInviteForUser(
  rawCode: string,
  userId: string,
): Promise<InviteRpcResult> {
  const code = normalizeInviteCode(rawCode);
  const supabase = await createClient();

  if (supabase) {
    const { data, error } = await supabase.rpc("consume_invite", {
      p_code: code,
    });

    if (!error && typeof data === "boolean") return data;
    if (error && !isMissingRpc(error)) return null;
    // Missing RPC → pre-0059 live DB. Fall through.
  }

  return consumeInviteViaServiceRole(code, userId);
}

async function consumeInviteViaServiceRole(
  code: string,
  userId: string,
): Promise<InviteRpcResult> {
  try {
    const svc = createServiceClient();

    const { data: row, error: readErr } = await svc
      .from("invite_codes")
      .select("code, uses_count, max_uses, expires_at, used_by")
      .eq("code", code)
      .maybeSingle();

    if (readErr) return null;
    if (!row) return false;

    if (row.used_by === userId) {
      await stampInviteConsumedAt(svc, userId);
      return true;
    }
    if (row.expires_at && Date.parse(row.expires_at) <= Date.now()) {
      return false;
    }
    if (row.uses_count >= row.max_uses) return false;

    const { data: updated, error: updErr } = await svc
      .from("invite_codes")
      .update({
        uses_count: row.uses_count + 1,
        used_by: userId,
        used_at: new Date().toISOString(),
      })
      .eq("code", code)
      .eq("uses_count", row.uses_count)
      .select("code")
      .maybeSingle();

    if (updErr) return null;
    if (!updated) return false;
    await stampInviteConsumedAt(svc, userId);
    return true;
  } catch {
    return null;
  }
}

/** Best-effort: column exists only after 0059 is applied. */
async function stampInviteConsumedAt(
  svc: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<void> {
  const { error } = await svc
    .from("members")
    .update({ invite_consumed_at: new Date().toISOString() })
    .eq("id", userId);
  if (error && !isMissingColumn(error)) {
    // Non-missing-column errors are swallowed: consume already
    // succeeded on invite_codes. Restrictive RLS after apply is
    // the hard gate; a failed stamp is retried on next consume
    // (used_by match).
    return;
  }
}

function isMissingColumn(error: { code?: string; message?: string }): boolean {
  const code = error.code ?? "";
  if (code === "PGRST204" || code === "42703") return true;
  return (error.message ?? "").toLowerCase().includes("invite_consumed_at");
}
