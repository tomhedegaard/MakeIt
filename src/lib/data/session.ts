import { createClient } from "@/lib/supabase/server";
import type { Session } from "@/lib/workout";

/**
 * Fetch a full session (with exercises and sets) for the active workout
 * flow. Returns null in demo mode so the page can fall back to the
 * in-memory TODAY_SESSION.
 */
export async function getFullSession(
  sessionId: string,
  memberId: string
): Promise<Session | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("sessions")
    .select(
      `
      id, week, day_label, title, estimated_minutes,
      program:programs(code, name),
      exercises:session_exercises(
        id, exercise_name, cue, position,
        sets:session_sets(
          id, position, target_reps, target_weight, target_rpe, rest_sec,
          logged_reps, logged_weight, logged_rpe, logged_at
        )
      )
    `
    )
    .eq("id", sessionId)
    .eq("member_id", memberId)
    .maybeSingle();

  if (error || !data) return null;

  const program = Array.isArray(data.program) ? data.program[0] : data.program;
  const exercises = (data.exercises ?? [])
    .slice()
    .sort((a, b) => a.position - b.position);

  return {
    id: data.id,
    programCode: program?.code ?? "—",
    programName: program?.name ?? "",
    week: data.week ?? 1,
    dayLabel: data.day_label ?? "",
    title: data.title,
    estimatedMinutes: data.estimated_minutes ?? 0,
    exercises: exercises.map((ex) => ({
      id: ex.id,
      name: ex.exercise_name,
      cue: ex.cue ?? undefined,
      sets: (ex.sets ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((s) => ({
          id: s.id,
          targetReps: s.target_reps ?? 0,
          targetWeight: Number(s.target_weight ?? 0),
          targetRpe: s.target_rpe != null ? Number(s.target_rpe) : undefined,
          restSec: s.rest_sec ?? 0,
          loggedReps: s.logged_reps ?? undefined,
          loggedWeight: s.logged_weight != null ? Number(s.logged_weight) : undefined,
          loggedRpe: s.logged_rpe != null ? Number(s.logged_rpe) : undefined,
          done: s.logged_at != null,
        })),
    })),
  };
}
