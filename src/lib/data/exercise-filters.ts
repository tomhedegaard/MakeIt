/**
 * Exercise filtering as pure functions, free of the server-only
 * Supabase client, so the demo-mode path and the tests share one
 * definition with the SQL filters in exercises.ts.
 */
import type { Exercise, ExerciseDifficulty } from "./exercises";
import { orderByTaxonomy } from "./exercise-taxonomy";

export type ExerciseFilters = {
  category?: string;
  equipment?: string;
  pattern?: string;
  difficulty?: ExerciseDifficulty;
  /** Free-text search on the exercise name. */
  q?: string;
};

type Filterable = Pick<Exercise, "name" | "category" | "equipment" | "pattern" | "difficulty">;

/** The in-memory twin of the SQL filters in listPublishedExercises. */
export function matchesFilters(e: Filterable, f: ExerciseFilters): boolean {
  if (f.category && e.category !== f.category) return false;
  if (f.equipment && e.equipment !== f.equipment) return false;
  if (f.pattern && e.pattern !== f.pattern) return false;
  if (f.difficulty && e.difficulty !== f.difficulty) return false;
  const q = f.q?.trim().toLowerCase();
  if (q && !e.name.toLowerCase().includes(q)) return false;
  return true;
}

/** Escapes LIKE wildcards so a search for "50%" or "a_b" matches those characters literally. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export type ExerciseFacets = { categories: string[]; equipment: string[] };

/** The categories and equipment that occur in `rows`, in taxonomy order. */
export function facetsOf(rows: readonly { category: string | null; equipment: string | null }[]): ExerciseFacets {
  const present = (key: "category" | "equipment") =>
    rows.map((r) => r[key]).filter((v): v is string => Boolean(v));
  return {
    categories: orderByTaxonomy("categories", present("category")),
    equipment: orderByTaxonomy("equipment", present("equipment")),
  };
}
