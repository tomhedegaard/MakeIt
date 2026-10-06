/**
 * The calorie floor (spec 2026-09-27 §S, plan F.3): HQ never sets a daily
 * target below the member's resting metabolic rate, and never below
 * 1.500 kcal for women or 1.800 kcal for men. Sex unknown counts as the
 * higher floor (decision 4, 06.10.2026), so until the body data in B2
 * exists every member gets 1.800.
 */
export const FLOOR_FEMALE_KCAL = 1500;
export const FLOOR_DEFAULT_KCAL = 1800;

export function calorieFloor(body: { sex?: "f" | "m" | null; bmrKcal?: number | null } = {}): number {
  const bySex = body.sex === "f" ? FLOOR_FEMALE_KCAL : FLOOR_DEFAULT_KCAL;
  return Math.max(bySex, Math.round(body.bmrKcal ?? 0));
}
