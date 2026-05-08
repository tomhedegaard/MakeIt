"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";

export type SetInput = {
  id: string | null; // null = new
  position: number;
  targetReps: number;
  targetWeight: number;
  targetRpe: number | null;
  restSec: number;
};

export type ExerciseInput = {
  id: string | null;
  position: number;
  exerciseName: string;
  cue: string | null;
  sets: SetInput[];
};

export type SessionUpdate = {
  sessionId: string;
  memberId: string;
  title: string;
  dayLabel: string;
  scheduledFor: string | null;
  estimatedMinutes: number;
  exercises: ExerciseInput[];
};

/**
 * Save a coach's edits to a member's session. Atomic-ish — diffs the
 * payload against existing rows, then deletes/updates/inserts:
 *   exercises in DB but not in payload  → DELETE
 *   exercises with an id                → UPDATE
 *   exercises without an id             → INSERT
 * Same logic per set inside each exercise. RLS gates everything to
 * coaches via the additive policies in 0011.
 */
export async function updateSessionAction(
  payload: SessionUpdate
): Promise<{ ok: boolean }> {
  if (!SUPABASE_ENABLED) return { ok: true };

  const supabase = await createClient();
  if (!supabase) return { ok: false };

  // Top-level session metadata
  const { error: sErr } = await supabase
    .from("sessions")
    .update({
      title: payload.title,
      day_label: payload.dayLabel,
      scheduled_for: payload.scheduledFor,
      estimated_minutes: payload.estimatedMinutes,
    })
    .eq("id", payload.sessionId);
  if (sErr) return { ok: false };

  // Existing exercises
  const { data: existingEx } = await supabase
    .from("session_exercises")
    .select("id, sets:session_sets(id)")
    .eq("session_id", payload.sessionId);

  const keepExIds = new Set(
    payload.exercises.map((e) => e.id).filter((id): id is string => !!id)
  );
  const exToDelete = (existingEx ?? [])
    .filter((e) => !keepExIds.has(e.id))
    .map((e) => e.id);

  if (exToDelete.length > 0) {
    await supabase.from("session_exercises").delete().in("id", exToDelete);
  }

  // Update or insert each exercise + its sets
  for (const ex of payload.exercises) {
    let exId = ex.id;
    if (exId) {
      await supabase
        .from("session_exercises")
        .update({
          exercise_name: ex.exerciseName,
          cue: ex.cue,
          position: ex.position,
        })
        .eq("id", exId);
    } else {
      const { data: inserted } = await supabase
        .from("session_exercises")
        .insert({
          session_id: payload.sessionId,
          exercise_name: ex.exerciseName,
          cue: ex.cue,
          position: ex.position,
        })
        .select("id")
        .single();
      exId = inserted?.id ?? null;
      if (!exId) continue;
    }

    // Diff sets
    const { data: existingSets } = await supabase
      .from("session_sets")
      .select("id")
      .eq("session_exercise_id", exId);
    const keepSetIds = new Set(
      ex.sets.map((s) => s.id).filter((id): id is string => !!id)
    );
    const setsToDelete = (existingSets ?? [])
      .filter((s) => !keepSetIds.has(s.id))
      .map((s) => s.id);
    if (setsToDelete.length > 0) {
      await supabase.from("session_sets").delete().in("id", setsToDelete);
    }

    for (const s of ex.sets) {
      if (s.id) {
        await supabase
          .from("session_sets")
          .update({
            position: s.position,
            target_reps: s.targetReps,
            target_weight: s.targetWeight,
            target_rpe: s.targetRpe,
            rest_sec: s.restSec,
          })
          .eq("id", s.id);
      } else {
        await supabase.from("session_sets").insert({
          session_exercise_id: exId,
          position: s.position,
          target_reps: s.targetReps,
          target_weight: s.targetWeight,
          target_rpe: s.targetRpe,
          rest_sec: s.restSec,
        });
      }
    }
  }

  // Refresh both coach and member surfaces.
  revalidatePath(`/coach/members/${payload.memberId}`);
  revalidatePath(`/coach/sessions/${payload.sessionId}/edit`);
  revalidatePath("/dashboard");
  revalidatePath("/coaching");
  return { ok: true };
}
