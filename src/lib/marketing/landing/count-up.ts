/**
 * The number a count-up shows at `progress` (0 to 1) of its run toward
 * `to`: ease-out cubic, whole numbers, clamped at both ends so a late
 * frame never overshoots.
 */
export function countUpAt(progress: number, to: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return Math.round(to * (1 - (1 - p) ** 3));
}

/** Sum of one field across the example week. */
export function weekTotal<T>(rows: readonly T[], pick: (row: T) => number): number {
  return rows.reduce((n, row) => n + pick(row), 0);
}
