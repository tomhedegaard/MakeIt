/**
 * Exercise library — query layer for /train/exercises/*.
 *
 * The `exercises` table (0001 + 0028) is source-of-truth. We expose
 * a typed view + a mock dataset for demo mode so the UI can
 * render without Supabase. Mock is the 20 v1 lifts from
 * supabase/seed-exercises.sql; demoAssetUrl is set for every slug
 * that has a trio in public/exercise-demos/ (front-squat stays null).
 */
import { createClient } from "@/lib/supabase/server";
import { MOCK_EXERCISES } from "@/lib/data/exercise-mocks";
import type { MuscleGroup } from "@/lib/data/muscle-groups";

export type ExerciseDifficulty = "beginner" | "intermediate" | "advanced";

export type ExerciseMistake = { title: string; body: string };

/**
 * A single phase of a rep — what muscles dominate, and for how long.
 * Animation cycles through these to show how recruitment shifts as
 * the movement progresses (e.g. quads on the way down, glutes on
 * the way up in a squat).
 */
export type ExercisePhase = {
  name: string;
  duration_ms: number;
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  tertiary: MuscleGroup[];
};

export type Exercise = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  pattern: string | null;
  equipment: string | null;
  difficulty: ExerciseDifficulty | null;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  tertiaryMuscles: MuscleGroup[];
  cues: string[];
  mistakes: ExerciseMistake[];
  whyMatters: string | null;
  setup: string | null;
  progression: string | null;
  regression: string | null;
  demoAssetUrl: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  displayOrder: number;
  isPublished: boolean;
  phases: ExercisePhase[];
};

/* ---------------------------------------------------------------- *
 * Row -> Exercise mapping
 * ---------------------------------------------------------------- */

type ExerciseRow = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  pattern: string | null;
  equipment: string | null;
  difficulty: string | null;
  primary_muscles: string[] | null;
  secondary_muscles: string[] | null;
  tertiary_muscles: string[] | null;
  cues: unknown;
  mistakes: unknown;
  why_matters: string | null;
  setup: string | null;
  progression: string | null;
  regression: string | null;
  demo_asset_url: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  display_order: number | null;
  is_published: boolean | null;
  phases: unknown;
};

const SELECT_COLS =
  "id, slug, name, category, pattern, equipment, difficulty, " +
  "primary_muscles, secondary_muscles, tertiary_muscles, " +
  "cues, mistakes, why_matters, setup, progression, regression, " +
  "demo_asset_url, video_url, thumbnail_url, display_order, is_published, phases";

function isExercisePhase(p: unknown): p is ExercisePhase {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.name === "string" &&
    typeof o.duration_ms === "number" &&
    Array.isArray(o.primary) &&
    Array.isArray(o.secondary) &&
    Array.isArray(o.tertiary)
  );
}

/** Narrow unknown JSON (DB jsonb / mock) to the phase list the UI can play. */
export function parseExercisePhases(raw: unknown): ExercisePhase[] {
  return Array.isArray(raw) ? raw.filter(isExercisePhase) : [];
}

function asExercise(r: ExerciseRow): Exercise {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    category: r.category,
    pattern: r.pattern,
    equipment: r.equipment,
    difficulty:
      r.difficulty === "beginner" || r.difficulty === "intermediate" || r.difficulty === "advanced"
        ? r.difficulty
        : null,
    primaryMuscles: (r.primary_muscles ?? []) as MuscleGroup[],
    secondaryMuscles: (r.secondary_muscles ?? []) as MuscleGroup[],
    tertiaryMuscles: (r.tertiary_muscles ?? []) as MuscleGroup[],
    cues: Array.isArray(r.cues) ? (r.cues as string[]) : [],
    mistakes: Array.isArray(r.mistakes) ? (r.mistakes as ExerciseMistake[]) : [],
    whyMatters: r.why_matters,
    setup: r.setup,
    progression: r.progression,
    regression: r.regression,
    demoAssetUrl: r.demo_asset_url,
    videoUrl: r.video_url,
    thumbnailUrl: r.thumbnail_url,
    displayOrder: r.display_order ?? 0,
    isPublished: r.is_published ?? false,
    phases: parseExercisePhases(r.phases),
  };
}

/* ---------------------------------------------------------------- *
 * Public API
 * ---------------------------------------------------------------- */

export type ExerciseFilters = {
  category?: string;
  equipment?: string;
  pattern?: string;
  difficulty?: ExerciseDifficulty;
};

export async function listPublishedExercises(
  filters: ExerciseFilters = {},
): Promise<Exercise[]> {
  const supabase = await createClient();
  if (!supabase) return MOCK_EXERCISES.filter((e) => matches(e, filters));

  let q = supabase
    .from("exercises")
    .select(SELECT_COLS)
    .eq("is_published", true)
    .order("display_order", { ascending: true });

  if (filters.category) q = q.eq("category", filters.category);
  if (filters.equipment) q = q.eq("equipment", filters.equipment);
  if (filters.pattern) q = q.eq("pattern", filters.pattern);
  if (filters.difficulty) q = q.eq("difficulty", filters.difficulty);

  const { data } = await q;
  // Supabase's generated DB types don't yet include the columns added
  // in migration 0028 — cast via unknown until `npm run db:types` is
  // re-run against the cloud project.
  return (data ?? []).map((r) => asExercise(r as unknown as ExerciseRow));
}

export async function getExerciseBySlug(slug: string): Promise<Exercise | null> {
  const supabase = await createClient();
  if (!supabase) {
    return MOCK_EXERCISES.find((e) => e.slug === slug) ?? null;
  }

  const { data } = await supabase
    .from("exercises")
    .select(SELECT_COLS)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  return data ? asExercise(data as unknown as ExerciseRow) : null;
}

/* ---------------------------------------------------------------- *
 * Coach editor — reads include unpublished drafts
 * ---------------------------------------------------------------- */

/** Every exercise, published + draft, for the /coach/exercises list. */
export async function listAllExercisesForCoach(): Promise<Exercise[]> {
  const supabase = await createClient();
  if (!supabase) return MOCK_EXERCISES;

  const { data } = await supabase
    .from("exercises")
    .select(SELECT_COLS)
    .order("display_order", { ascending: true });

  return (data ?? []).map((r) => asExercise(r as unknown as ExerciseRow));
}

/** A single exercise for the editor — resolves drafts too. */
export async function getExerciseForEdit(
  slug: string,
): Promise<Exercise | null> {
  const supabase = await createClient();
  if (!supabase) return MOCK_EXERCISES.find((e) => e.slug === slug) ?? null;

  const { data } = await supabase
    .from("exercises")
    .select(SELECT_COLS)
    .eq("slug", slug)
    .maybeSingle();

  return data ? asExercise(data as unknown as ExerciseRow) : null;
}

/**
 * The dominant view to show on the figure when previewing an
 * exercise. Counts primary+secondary muscles per side, ties go to
 * back (most posterior-chain lifts read better from behind).
 */
export function dominantView(ex: Exercise): "front" | "back" {
  const FRONT = new Set<MuscleGroup>([
    "neck", "chest", "front_delts", "biceps", "forearms", "abs",
    "obliques", "adductors", "quads", "calves_front",
  ]);
  const all = [...ex.primaryMuscles, ...ex.secondaryMuscles];
  let front = 0;
  let back = 0;
  for (const m of all) {
    if (FRONT.has(m)) front++;
    else back++;
  }
  return back >= front ? "back" : "front";
}

// Demo-asset resolution lives in its own dependency-free module so
// client components can use it without pulling this server-tainted
// file (it imports @/lib/supabase/server) into the browser bundle.
export { resolveDemoAssets, type DemoAssets } from "@/lib/data/demo-assets";

function matches(e: Exercise, f: ExerciseFilters): boolean {
  if (f.category && e.category !== f.category) return false;
  if (f.equipment && e.equipment !== f.equipment) return false;
  if (f.pattern && e.pattern !== f.pattern) return false;
  if (f.difficulty && e.difficulty !== f.difficulty) return false;
  return true;
}

/* Demo-mode mocks live in exercise-mocks.ts (20 v1 lifts). */

