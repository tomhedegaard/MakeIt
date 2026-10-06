/**
 * Et sundt forhold til mad og krop (spec 2026-09-27 §S). Pure rules:
 * the pejlemærke's limits, resting metabolic rate for the calorie floor,
 * HQ's pace cap, and the weight card's 7-day average and direction.
 * A direction, never a distance: nothing here counts down to a weight.
 */

export type Sex = "f" | "m" | "unspecified";

export const MIN_BMI = 18.5;
/** HQ never plans a change faster than 0,5 % of body weight per week. */
export const MAX_WEEKLY_CHANGE_RATIO = 0.005;

/** The lowest pejlemærke HQ accepts for a height: BMI 18,5, rounded up to 0,1 kg. */
export function minPejlemaerkeKg(heightCm: number): number {
  const m = heightCm / 100;
  return Math.ceil(MIN_BMI * m * m * 10) / 10;
}

export type PejlemaerkeCheck = { ok: true } | { ok: false; reason: "needsHeight" | "belowHealthy" };

export function checkPejlemaerke(kg: number, heightCm: number | null): PejlemaerkeCheck {
  if (!heightCm) return { ok: false, reason: "needsHeight" };
  return kg >= minPejlemaerkeKg(heightCm) ? { ok: true } : { ok: false, reason: "belowHealthy" };
}

/** Mifflin-St Jeor resting metabolic rate. Null without all four inputs or with sex unspecified. */
export function restingKcal(body: {
  weightKg: number | null;
  heightCm: number | null;
  birthYear: number | null;
  sex: Sex | null;
  year?: number;
}): number | null {
  const { weightKg, heightCm, birthYear, sex } = body;
  if (!weightKg || !heightCm || !birthYear || (sex !== "f" && sex !== "m")) return null;
  const age = (body.year ?? new Date().getFullYear()) - birthYear;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === "m" ? base + 5 : base - 161);
}

/** Cap a weekly weight-change goal (kg/week, signed) to 0,5 % of body weight. */
export function capWeeklyChangeKg(targetKgPerWeek: number, weightKg: number | null): number {
  if (!weightKg) return targetKgPerWeek;
  const cap = weightKg * MAX_WEEKLY_CHANGE_RATIO;
  return Math.sign(targetKgPerWeek) * Math.min(Math.abs(targetKgPerWeek), cap);
}

export type WeightDirection = "down" | "up" | "stable";

/**
 * 7-day averages for the last `days` days, oldest first. A day without a
 * weigh-in carries the average of the readings in its window; days before
 * the first reading are skipped. A single weigh-in swings 1–2 kg, so the
 * card never shows one.
 */
export function sevenDayAverages(
  weights: Array<{ kg: number; date: string }>,
  today: string,
  days = 14,
): number[] {
  const byDate = new Map<string, number>();
  for (const w of weights) byDate.set(w.date, w.kg);
  const out: number[] = [];
  const end = Date.parse(`${today}T00:00:00Z`);
  for (let d = days - 1; d >= 0; d--) {
    const day = end - d * 86_400_000;
    const window: number[] = [];
    for (let k = 0; k < 7; k++) {
      const kg = byDate.get(new Date(day - k * 86_400_000).toISOString().slice(0, 10));
      if (kg !== undefined) window.push(kg);
    }
    if (window.length) out.push(Math.round((window.reduce((a, b) => a + b, 0) / window.length) * 10) / 10);
  }
  return out;
}

/** Direction over the averages: ±0,3 kg is noise. */
export function weightDirection(averages: number[]): WeightDirection | null {
  if (averages.length < 2) return null;
  const delta = averages[averages.length - 1] - averages[0];
  if (delta <= -0.3) return "down";
  if (delta >= 0.3) return "up";
  return "stable";
}
