import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MuscleGroup } from "@/lib/data/muscle-groups";

/**
 * Member-facing program template fetcher. Pulls a *published* program
 * by its short code along with its day-blueprint structure: days,
 * exercises (including library slug + primary muscles for deep-links
 * and the mini anatomy figure), and the per-set scheme. Returns null
 * when no published program with that code exists.
 *
 * The `program_days` table only defines the weekly template — there's
 * no week dimension on the blueprint. Each week of the program runs
 * the same days; weekly progression is applied at session-generation
 * time (see lib/data/program-generator.ts). The UI therefore shows
 * the template once and labels the program "N uger med progressivt
 * overload".
 */

export type ProgramDetailSet = {
  reps: number;
  weight: number;
  rpe: number | null;
  rest_sec: number;
};

export type ProgramDetailExercise = {
  id: string;
  exerciseName: string;
  cue: string | null;
  position: number;
  /** Slug from the exercises library — null for free-text entries. */
  slug: string | null;
  primaryMuscles: MuscleGroup[];
  sets: ProgramDetailSet[];
};

export type ProgramDetailDay = {
  id: string;
  position: number;
  dayLabel: string;
  title: string;
  estimatedMinutes: number | null;
  exercises: ProgramDetailExercise[];
};

export type ProgramDetail = {
  id: string;
  code: string;
  name: string;
  type: string;
  description: string | null;
  weeks: number;
  level: string | null;
  coachName: string | null;
  days: ProgramDetailDay[];
};

type RawDay = {
  id: string;
  position: number;
  day_label: string;
  title: string;
  estimated_minutes: number | null;
  exercises?:
    | {
        id: string;
        exercise_name: string;
        cue: string | null;
        position: number;
        sets: unknown;
        library:
          | { slug: string | null; primary_muscles: string[] | null }
          | { slug: string | null; primary_muscles: string[] | null }[]
          | null;
      }[]
    | null;
};

type RawCoach = { handle: string | null } | { handle: string | null }[] | null;

type RawProgram = {
  id: string;
  code: string;
  name: string;
  type: string;
  description: string | null;
  weeks: number;
  level: string | null;
  coach: RawCoach;
  days?: RawDay[] | null;
};

export async function getMemberProgramByCode(
  code: string,
): Promise<ProgramDetail | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("programs")
    .select(
      `
      id, code, name, type, description, weeks, level,
      coach:members(handle),
      days:program_days(
        id, position, day_label, title, estimated_minutes,
        exercises:program_day_exercises(
          id, exercise_name, cue, position, sets,
          library:exercises(slug, primary_muscles)
        )
      )
    `,
    )
    .eq("code", code)
    .eq("is_published", true)
    .maybeSingle<RawProgram>();

  if (!data) return null;

  const coach = unwrapOne(data.coach);
  const days: ProgramDetailDay[] = (data.days ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((d) => ({
      id: d.id,
      position: d.position,
      dayLabel: d.day_label,
      title: d.title,
      estimatedMinutes: d.estimated_minutes,
      exercises: (d.exercises ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((e) => {
          const lib = unwrapOne(e.library);
          return {
            id: e.id,
            exerciseName: e.exercise_name,
            cue: e.cue,
            position: e.position,
            slug: lib?.slug ?? null,
            primaryMuscles: (lib?.primary_muscles ?? []) as MuscleGroup[],
            sets: normalizeSets(e.sets),
          };
        }),
    }));

  return {
    id: data.id,
    code: data.code,
    name: data.name,
    type: data.type,
    description: data.description,
    weeks: data.weeks,
    level: data.level,
    coachName: coach?.handle ? `@${coach.handle}` : null,
    days,
  };
}

function normalizeSets(raw: unknown): ProgramDetailSet[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .map((s) => ({
      reps: Number(s.reps ?? 0),
      weight: Number(s.weight ?? 0),
      rpe: s.rpe == null ? null : Number(s.rpe),
      rest_sec: Number(s.rest_sec ?? 0),
    }));
}

function unwrapOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}
