/**
 * Invite-code access — connected mode only.
 *
 * Validate via the existing `is_invite_valid` RPC (granted to anon).
 * Consume via service-role: `invite_codes` has no client policies, so
 * a user-scoped UPDATE is denied by RLS (the silent-fail bug).
 *
 * Never call `consumeInviteForUser` from a demo path. `createServiceClient`
 * throws if the service-role key is missing — we catch and fail closed.
 *
 * Spec: docs/superpowers/specs/2026-08-31-invite-gate-enforcement.md
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  normalizeInviteCode,
  type InviteRpcResult,
} from "@/lib/invite-gate";

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

export async function consumeInviteForUser(
  rawCode: string,
  userId: string,
): Promise<InviteRpcResult> {
  try {
    const svc = createServiceClient();
    const code = normalizeInviteCode(rawCode);

    const { data: row, error: readErr } = await svc
      .from("invite_codes")
      .select("code, uses_count, max_uses, expires_at, used_by")
      .eq("code", code)
      .maybeSingle();

    if (readErr) return null;
    if (!row) return false;
    if (row.used_by === userId) return true;
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
    return true;
  } catch {
    return null;
  }
}
