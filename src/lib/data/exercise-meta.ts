import type { Exercise } from "./exercises";

/** The subset of a next-intl translator the helper needs (scoped to "Train"). */
type TrainT = { (key: string): string; has(key: string): boolean };

/**
 * Category, equipment and difficulty as the member reads them: translated
 * labels, never the raw catalogue enums ("lower-body", "barbell"). A value
 * with no translation yet falls back to itself rather than disappearing.
 */
export function exerciseMetaLabels(
  t: TrainT,
  ex: Pick<Exercise, "category" | "equipment" | "difficulty">,
): string[] {
  const label = (group: string, value: string | null) =>
    value ? (t.has(`${group}.${value}`) ? t(`${group}.${value}`) : value) : null;
  return [label("categories", ex.category), label("equipment", ex.equipment), label("difficulty", ex.difficulty)].filter(
    (v): v is string => Boolean(v),
  );
}
