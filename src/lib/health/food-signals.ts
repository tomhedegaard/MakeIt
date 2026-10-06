/**
 * Tidlige tegn (spec 2026-09-27 §S): patterns that can mean a strained
 * relationship with food. Never shown to the member as a warning; the
 * coach gets a discreet inbox item, the member a soft question at the
 * next mind-check. Pure: the loaders gather the rows.
 */

export type FoodSignalKey = "underFloor" | "pejlemaerkeLowered" | "estimatesCutDown" | "frequentWeighing";

export interface FoodSignalInput {
  today: string;
  floorKcal: number;
  /** Eaten kcal per day, with how many meals were logged that day. */
  days: Array<{ date: string; kcal: number; logs: number }>;
  /** Every pejlemærke set, oldest first. */
  pejlemaerke: Array<{ kg: number; at: string }>;
  /** HQ estimates the member approved, with the interval HQ gave. */
  estimates: Array<{ date: string; kcal: number; low: number | null; edited: boolean }>;
  /** Weigh-ins per day (each save counts, also a same-day overwrite). */
  weighIns: Array<{ date: string; count: number }>;
}

const DAY = 86_400_000;
// ponytail: a day counts as fully logged at 3 meals; partial logging would
// otherwise look like eating under the floor. Tune if coaches see noise.
const FULL_DAY_LOGS = 3;

function daysBefore(today: string, date: string): number {
  return Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date.slice(0, 10)}T00:00:00Z`)) / DAY);
}

function underFloorStreak(input: FoodSignalInput): boolean {
  const under = new Set(
    input.days.filter((d) => d.logs >= FULL_DAY_LOGS && d.kcal < input.floorKcal).map((d) => d.date),
  );
  for (const date of under) {
    const t = Date.parse(`${date}T00:00:00Z`);
    const next = (n: number) => new Date(t + n * DAY).toISOString().slice(0, 10);
    if (daysBefore(input.today, date) <= 14 && under.has(next(1)) && under.has(next(2))) return true;
  }
  return false;
}

function pejlemaerkeLowered(input: FoodSignalInput): boolean {
  let lowered = 0;
  for (let i = 1; i < input.pejlemaerke.length; i++) {
    const cur = input.pejlemaerke[i];
    if (cur.kg < input.pejlemaerke[i - 1].kg && daysBefore(input.today, cur.at) <= 30) lowered++;
  }
  return lowered >= 3;
}

function estimatesCutDown(input: FoodSignalInput): boolean {
  return (
    input.estimates.filter(
      (e) => e.edited && e.low !== null && e.kcal < e.low && daysBefore(input.today, e.date) <= 14,
    ).length >= 3
  );
}

function frequentWeighing(input: FoodSignalInput): boolean {
  return input.weighIns.some((w) => w.count >= 3 && daysBefore(input.today, w.date) <= 7);
}

export function foodSignals(input: FoodSignalInput): FoodSignalKey[] {
  const out: FoodSignalKey[] = [];
  if (underFloorStreak(input)) out.push("underFloor");
  if (pejlemaerkeLowered(input)) out.push("pejlemaerkeLowered");
  if (estimatesCutDown(input)) out.push("estimatesCutDown");
  if (frequentWeighing(input)) out.push("frequentWeighing");
  return out;
}
