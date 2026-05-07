"use server";

import { createClient } from "@/lib/supabase/server";
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
