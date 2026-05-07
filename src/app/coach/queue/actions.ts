"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";

/**
 * Coach reviews a form-check: stamps reviewed_by/at and saves notes.
 * RLS enforces is_current_user_coach() — the action will simply fail
 * for non-coach users.
 */
export async function reviewFormCheckAction(
  formCheckId: string,
  notes: string
): Promise<{ ok: boolean }> {
  if (!SUPABASE_ENABLED) return { ok: true };

  const supabase = await createClient();
  if (!supabase) return { ok: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("form_checks")
    .update({
      coach_reviewed_by: user.id,
      coach_reviewed_at: new Date().toISOString(),
      coach_notes: notes.slice(0, 1000) || null,
    })
    .eq("id", formCheckId);

  if (error) return { ok: false };

  revalidatePath("/coach");
  revalidatePath("/coach/queue");
  return { ok: true };
}
