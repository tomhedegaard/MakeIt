"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";

type Status = "pending" | "approved" | "shipped" | "fulfilled" | "cancelled";

/**
 * Coach-side fulfilment action. Marks a redemption as approved/shipped/
 * fulfilled/cancelled. RLS enforces is_current_user_coach() — non-coach
 * calls are silently denied.
 */
export async function setRedemptionStatusAction(
  redemptionId: string,
  status: Status,
  notes?: string
): Promise<{ ok: boolean }> {
  if (!SUPABASE_ENABLED) return { ok: true };

  const supabase = await createClient();
  if (!supabase) return { ok: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const update: Record<string, unknown> = { status };
  if (status === "fulfilled" || status === "shipped") {
    update.fulfilled_at = new Date().toISOString();
    update.fulfilled_by = user.id;
  }
  if (notes) update.fulfillment_notes = notes.slice(0, 500);

  const { error } = await supabase
    .from("reward_redemptions")
    .update(update)
    .eq("id", redemptionId);

  if (error) return { ok: false };

  revalidatePath("/coach");
  revalidatePath("/coach/redemptions");
  // Surface the new status on the member's /reps page too.
  revalidatePath("/reps");
  return { ok: true };
}
