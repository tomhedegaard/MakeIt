"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";

/**
 * Coach marks a member's early food signs as seen (spec §S). They stay out
 * of the inbox for 14 days; if the pattern is still there after, it returns.
 * RLS on food_signals (0070) lets only coaches write.
 */
export async function markFoodSignalSeenAction(memberId: string): Promise<{ ok: boolean }> {
  if (!SUPABASE_ENABLED) return { ok: true };
  const supabase = await createClient();
  if (!supabase) return { ok: false };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const now = new Date();
  const { error } = await supabase.from("food_signals").upsert({
    member_id: memberId,
    coach_seen_until: new Date(now.getTime() + 14 * 86_400_000).toISOString(),
    coach_seen_by: user.id,
    updated_at: now.toISOString(),
  });
  if (error) return { ok: false };

  revalidatePath("/coach/inbox");
  return { ok: true };
}
