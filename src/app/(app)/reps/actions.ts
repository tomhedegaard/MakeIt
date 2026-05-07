"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";

export type RedeemResult =
  | { ok: true; redemptionId: string }
  | { ok: false; reason: "auth" | "sold_out" | "insufficient_reps" | "unavailable" | "unknown"; message?: string };

/**
 * Redeem a reward atomically via the redeem_reward RPC.
 * In demo mode, returns a fake success so the UI can be exercised
 * without a backend.
 */
export async function redeemRewardAction(rewardId: string): Promise<RedeemResult> {
  if (!SUPABASE_ENABLED) {
    return { ok: true, redemptionId: `demo-${Date.now()}` };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "auth" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth" };

  const { data, error } = await supabase.rpc("redeem_reward", {
    p_reward_id: rewardId,
  });

  if (error) {
    const msg = error.message ?? "";
    type Reason = Extract<RedeemResult, { ok: false }>["reason"];
    let reason: Reason = "unknown";
    if (/sold out/i.test(msg)) reason = "sold_out";
    else if (/insufficient/i.test(msg)) reason = "insufficient_reps";
    else if (/unavailable|not yet/i.test(msg)) reason = "unavailable";
    else if (/auth/i.test(msg)) reason = "auth";
    return { ok: false, reason, message: msg };
  }

  // Refresh anywhere the balance / catalog stock / dashboard banner shows up.
  revalidatePath("/reps");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/coach");

  return { ok: true, redemptionId: String(data ?? "") };
}
