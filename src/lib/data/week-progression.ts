import { createClient } from "@/lib/supabase/server";
import {
  isDeloadWeek,
  progressWeek,
  type PrevSession,
} from "@/lib/data/program-generator";

/**
 * Detect when the active program's current week is fully complete and,
 * if so, generate the next week. Idempotent and safe to call from
 * server actions on every session completion.
 *
 * Returns the new week number when advancement happened, otherwise null.
 */
export async function maybeAdvanceWeek(
  memberId: string
): Promise<{ advancedTo: number; isDeload: boolean } | { completed: true } | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  // Active assignment + total weeks in program
  const { data: pa } = await supabase
    .from("program_assignments")
    .select(
      `
      id, program_id, current_week,
      programs:programs(weeks)
    `
    )
    .eq("member_id", memberId)
    .eq("status", "active")
    .maybeSingle();

  if (!pa) return null;

  const programs = Array.isArray(pa.programs) ? pa.programs[0] : pa.programs;
  const totalWeeks = programs?.weeks ?? 12;
  const week = pa.current_week as number;

  // All sessions for this week completed?
  const { count: incomplete } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("member_id", memberId)
    .eq("week", week)
    .neq("status", "completed");

  if ((incomplete ?? 0) > 0) return null;

  // End of program — mark assignment completed, no new week.
  if (week >= totalWeeks) {
    await supabase
      .from("program_assignments")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", pa.id);
    return { completed: true };
  }

  // Pull the just-completed week as the basis for progression.
  const { data: prev } = await supabase
    .from("sessions")
    .select(
      `
      day_label, title, estimated_minutes, scheduled_for,
      exercises:session_exercises(
        exercise_name, cue, position,
        sets:session_sets(
          position, target_reps, target_weight, target_rpe, rest_sec,
          logged_reps, logged_weight, logged_rpe, logged_at
        )
      )
    `
    )
    .eq("member_id", memberId)
    .eq("week", week)
    .order("scheduled_for");

  if (!prev || prev.length === 0) return null;

  const nextWeek = week + 1;
  const isDeload = isDeloadWeek(nextWeek);
  const nextSessions = progressWeek(prev as unknown as PrevSession[], isDeload);

  // Promote the assignment first so the dashboard reflects the new week
  // even if subsequent inserts fail mid-way.
  await supabase
    .from("program_assignments")
    .update({ current_week: nextWeek })
    .eq("id", pa.id);

  // Insert next week's sessions, scheduled with the same offsets from today.
  for (const s of nextSessions) {
    const d = new Date();
    d.setDate(d.getDate() + s.scheduledOffsetDays);

    const { data: sessionRow } = await supabase
      .from("sessions")
      .insert({
        member_id: memberId,
        program_id: pa.program_id,
        week: nextWeek,
        day_label: s.dayLabel,
        title: s.title,
        estimated_minutes: s.estimatedMinutes,
        status: "scheduled",
        scheduled_for: d.toISOString().slice(0, 10),
      })
      .select("id")
      .single();

    if (!sessionRow) continue;

    for (let i = 0; i < s.exercises.length; i++) {
      const ex = s.exercises[i];
      const { data: exRow } = await supabase
        .from("session_exercises")
        .insert({
          session_id: sessionRow.id,
          exercise_name: ex.name,
          cue: ex.cue,
          position: i + 1,
        })
        .select("id")
        .single();
      if (!exRow) continue;

      await supabase.from("session_sets").insert(
        ex.sets.map((set, j) => ({
          session_exercise_id: exRow.id,
          position: j + 1,
          target_reps: set.reps,
          target_weight: set.weight,
          target_rpe: set.rpe,
          rest_sec: set.restSec,
        }))
      );
    }
  }

  return { advancedTo: nextWeek, isDeload };
}
