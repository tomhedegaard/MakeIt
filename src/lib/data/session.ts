import { createClient } from "@/lib/supabase/server";
import type { ExerciseLibrary, Session } from "@/lib/workout";
import type { MuscleGroup } from "@/lib/data/muscle-groups";

/**
 * Fetch a full session (with exercises and sets) for the active workout
 * flow. Returns null in demo mode so the page can fall back to the
 * in-memory TODAY_SESSION.
 *
 * JOIN strategy: session_exercises.exercise_id (nullable FK) →
 * exercises. When set, we hydrate `library` with cues + muscle tiers
 * so the SessionClient can render the mini figure + structured cues.
 * When null (coach typed a free-text exercise), library = null and
 * the UI falls back to the legacy single-cue display.
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
        library:exercises(
          slug, primary_muscles, secondary_muscles, tertiary_muscles, cues
        ),
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
      library: shapeLibrary(ex.library),
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

type LibraryRow = {
  slug: string | null;
  primary_muscles: string[] | null;
  secondary_muscles: string[] | null;
  tertiary_muscles: string[] | null;
  cues: unknown;
};

function shapeLibrary(
  raw: LibraryRow | LibraryRow[] | null | undefined,
): ExerciseLibrary | null {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || !row.slug) return null;
  return {
    slug: row.slug,
    cues: Array.isArray(row.cues) ? (row.cues as string[]) : [],
    primaryMuscles: (row.primary_muscles ?? []) as MuscleGroup[],
    secondaryMuscles: (row.secondary_muscles ?? []) as MuscleGroup[],
    tertiaryMuscles: (row.tertiary_muscles ?? []) as MuscleGroup[],
  };
}
