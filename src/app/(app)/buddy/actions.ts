"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import {
  isBuddyInteractionKind,
  type BuddyInteractionKind,
} from "@/lib/data/buddy";

/**
 * Send a buddy reaction or nudge — CC-3 server action.
 *
 * Inserts a row into buddy_interactions; RLS enforces that the
 * caller is from_member and belongs to an active pair (policy
 * buddy_interactions_own_insert in migration 0045). Idempotent
 * re-presses just produce additional reaction rows — buddy thread
 * UI dedupes when rendering if needed.
 *
 * The reaction kind comes from the client component; we re-validate
 * it server-side because the RLS check trusts the row shape.
 */
export async function sendBuddyReactionAction(input: {
  pairId: string;
  kind: BuddyInteractionKind | string;
  body?: string | null;
}): Promise<{ ok: boolean; reason?: string }> {
  if (!isBuddyInteractionKind(input.kind)) {
    return { ok: false, reason: "invalid-kind" };
  }
  if (!SUPABASE_ENABLED) {
    // Demo mode — no-op success so the UI flow stays exercisable.
    return { ok: true };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "no-supabase" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  // Resolve the other member on the active pair — we need from/to,
  // and the pair's active-status guards the insert via the RLS policy.
  const { data: pair, error: pairErr } = await supabase
    .from("buddy_pairs")
    .select("member_a, member_b, unpaired_at")
    .eq("id", input.pairId)
    .single();
  if (pairErr || !pair) return { ok: false, reason: "pair-not-found" };
  if (pair.unpaired_at) return { ok: false, reason: "pair-ended" };

  const toMember =
    pair.member_a === user.id
      ? pair.member_b
      : pair.member_b === user.id
        ? pair.member_a
        : null;
  if (!toMember) return { ok: false, reason: "not-in-pair" };

  const { error: insErr } = await supabase
    .from("buddy_interactions")
    .insert({
      pair_id: input.pairId,
      from_member: user.id,
      to_member: toMember,
      kind: input.kind,
      body: input.body ?? null,
    });
  if (insErr) {
    console.warn("[buddy] reaction insert failed:", insErr.message);
    return { ok: false, reason: "insert-failed" };
  }

  revalidatePath("/buddy");
  return { ok: true };
}
