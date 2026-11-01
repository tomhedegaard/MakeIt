/**
 * Which days of a training week the sessions land on, by how many days
 * a week the member trains (onboarding `weekly_frequency`). Rest days
 * sit between hard days instead of 3–5 sessions on consecutive days.
 *
 * A program with more sessions than training days carries on into the
 * next week's pattern (4 sessions at 3 days → 0, 2, 4, 7), so rest
 * stays and no session is dropped or doubled up.
 */
const PATTERNS: Record<number, readonly number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};

/** Clamp to 1–7; anything missing or odd falls back to `fallback`. */
export function trainingDaysPerWeek(value: unknown, fallback: number): number {
  const n = Math.floor(Number(value));
  const pick = Number.isFinite(n) && n >= 1 ? n : Math.floor(fallback);
  return Math.min(7, Math.max(1, pick || 1));
}

/** Day offset (from the first session) of session `index` (0-based). */
export function trainingDayOffset(index: number, perWeek: number): number {
  const days = trainingDaysPerWeek(perWeek, 7);
  return 7 * Math.floor(index / days) + PATTERNS[days][index % days];
}
