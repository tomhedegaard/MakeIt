/**
 * Daily macro targets + portion scaling.
 *
 * The mock catalog (and a timed-out Claude draft) can land a day at
 * ~1500 kcal / ~70–110 g protein while the plan header still shows
 * the member's 2500 / 188 targets. This module is the single place
 * that (1) resolves those targets and (2) scales meal portions so
 * day totals track them.
 */

import type { Ingredient, Meal, MealKind, MealSlot, NutritionGoal } from "@/lib/data/nutrition";

/** Inclusive band around the daily target. Documented in the PR. */
export const PLAN_MACRO_TOLERANCE = {
  /** Day kcal must be within ±15% of target. */
  kcalRatio: 0.15,
  /**
   * Day protein must be within ±20% of target. Wider than kcal
   * because a low-density catalog day (~70 g P) cannot reach 188 g
   * by portion-scaling alone without blowing the kcal cap; the
   * mock picker rebalances first, then this band is the safety net.
   */
  proteinRatio: 0.2,
} as const;

export type DailyMacroTargets = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type PlanMealDraft = Omit<Meal, "id" | "planId">;

export type TargetProfile = {
  goal: NutritionGoal;
  dailyKcalTarget: number | null;
  dailyProteinGTarget: number | null;
};

export function defaultKcalForGoal(goal: NutritionGoal): number {
  switch (goal) {
    case "cut":
      return 2200;
    case "mass":
      return 3000;
    case "recomp":
      return 2500;
    case "maintain":
      return 2400;
    default: {
      const _exhaustive: never = goal;
      return _exhaustive;
    }
  }
}

/** Protein grams from a 30/40/30 split (kcal × 0.30 / 4). */
export function defaultProteinGForKcal(kcal: number): number {
  return Math.round((kcal * 0.3) / 4);
}

export function resolveDailyTargets(profile: TargetProfile): DailyMacroTargets {
  const kcal = profile.dailyKcalTarget ?? defaultKcalForGoal(profile.goal);
  const proteinG = profile.dailyProteinGTarget ?? defaultProteinGForKcal(kcal);
  const carbsG = Math.round((kcal * 0.4) / 4);
  const fatG = Math.round((kcal * 0.3) / 9);
  return { kcal, proteinG, carbsG, fatG };
}

export function sumDayMacros(meals: Array<{ estKcal?: number | null; estProteinG?: number | null }>): {
  kcal: number;
  proteinG: number;
} {
  return meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + (m.estKcal ?? 0),
      proteinG: acc.proteinG + (m.estProteinG ?? 0),
    }),
    { kcal: 0, proteinG: 0 },
  );
}

export function dayMacrosWithinBand(
  totals: { kcal: number; proteinG: number },
  targets: Pick<DailyMacroTargets, "kcal" | "proteinG">,
  tolerance = PLAN_MACRO_TOLERANCE,
): boolean {
  return (
    ratioOk(totals.kcal, targets.kcal, tolerance.kcalRatio) &&
    ratioOk(totals.proteinG, targets.proteinG, tolerance.proteinRatio)
  );
}

function ratioOk(actual: number, target: number, ratio: number): boolean {
  if (target <= 0) return actual === 0;
  const lo = target * (1 - ratio);
  const hi = target * (1 + ratio);
  // ±1 g / kcal slack so integer rounding does not fail the band.
  return actual + 1 >= lo && actual - 1 <= hi;
}

/**
 * Scale each day's meals so totals land near `targets`. Days with no
 * meals (skip days) are left untouched. May append a protein snack
 * when kcal-scaling alone still undershoots protein.
 */
export function scaleMealsToDailyTargets(
  meals: PlanMealDraft[],
  targets: Pick<DailyMacroTargets, "kcal" | "proteinG">,
): PlanMealDraft[] {
  const byDay = new Map<number, PlanMealDraft[]>();
  for (const meal of meals) {
    const arr = byDay.get(meal.dayIndex) ?? [];
    arr.push(meal);
    byDay.set(meal.dayIndex, arr);
  }

  const out: PlanMealDraft[] = [];
  const days = [...byDay.keys()].sort((a, b) => a - b);
  for (const day of days) {
    out.push(...scaleOneDay(byDay.get(day) ?? [], targets, day));
  }
  return out;
}

function scaleOneDay(
  meals: PlanMealDraft[],
  targets: Pick<DailyMacroTargets, "kcal" | "proteinG">,
  dayIndex: number,
): PlanMealDraft[] {
  if (meals.length === 0) return meals;

  const raw = sumDayMacros(meals);
  if (raw.kcal <= 0) return meals;

  const kcalScale = clamp(targets.kcal / raw.kcal, 0.6, 2.4);
  let scaled = meals.map((m) => scaleMealDraft(m, kcalScale));

  let totals = sumDayMacros(scaled);
  if (dayMacrosWithinBand(totals, targets)) return scaled;

  // Protein still short after portion-scaling — add a high-protein
  // snack, capped so the day stays inside the kcal band.
  const proteinFloor = targets.proteinG * (1 - PLAN_MACRO_TOLERANCE.proteinRatio);
  if (totals.proteinG < proteinFloor) {
    const kcalCeiling = targets.kcal * (1 + PLAN_MACRO_TOLERANCE.kcalRatio);
    const kcalRoom = Math.max(0, kcalCeiling - totals.kcal);
    const proteinGap = targets.proteinG - totals.proteinG;
    const booster = makeProteinBooster(dayIndex, nextPosition(scaled), proteinGap, kcalRoom);
    if (booster) {
      scaled = [...scaled, booster];
      totals = sumDayMacros(scaled);
    }
  }

  // Final kcal nudge if we overshot/undershot after the snack.
  if (totals.kcal > 0 && !ratioOk(totals.kcal, targets.kcal, PLAN_MACRO_TOLERANCE.kcalRatio)) {
    const nudge = clamp(targets.kcal / totals.kcal, 0.85, 1.15);
    scaled = scaled.map((m) => scaleMealDraft(m, nudge));
  }

  return scaled;
}

export function scaleMealDraft(meal: PlanMealDraft, scale: number): PlanMealDraft {
  if (!Number.isFinite(scale) || scale === 1) return meal;
  return {
    ...meal,
    ingredients: meal.ingredients.map((ing) => scaleIngredient(ing, scale)),
    estKcal: scaleMacro(meal.estKcal, scale),
    estProteinG: scaleMacro(meal.estProteinG, scale),
    estCarbsG: scaleMacro(meal.estCarbsG, scale),
    estFatG: scaleMacro(meal.estFatG, scale),
  };
}

function scaleIngredient(ing: Ingredient, scale: number): Ingredient {
  if (isFixedSeasoning(ing.unit)) return { ...ing };
  return { ...ing, amount: scaleAmount(ing.amount, scale) };
}

function isFixedSeasoning(unit: string): boolean {
  const u = unit.trim().toLowerCase();
  return u === "knsp" || u === "knsp." || u === "tsk" || u === "tsk.";
}

function scaleMacro(value: number | null, scale: number): number | null {
  if (value == null || !Number.isFinite(value)) return value;
  return Math.round(value * scale);
}

function scaleAmount(amount: number, scale: number): number {
  const n = amount * scale;
  if (!Number.isFinite(n)) return amount;
  if (n < 1) return Math.round(n * 10) / 10;
  if (n < 10) return Math.round(n * 2) / 2;
  if (n < 100) return Math.round(n);
  return Math.round(n / 5) * 5;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function nextPosition(meals: PlanMealDraft[]): number {
  return meals.reduce((max, m) => Math.max(max, m.position), -1) + 1;
}

/** 200 g skyr ≈ 220 kcal / 24 g protein — high protein density, on-allowlist. */
const BOOSTER = {
  kcal: 220,
  proteinG: 24,
  carbsG: 22,
  fatG: 1,
  grams: 200,
} as const;

function makeProteinBooster(
  dayIndex: number,
  position: number,
  proteinGap: number,
  kcalRoom: number,
): PlanMealDraft | null {
  if (proteinGap <= 0 || kcalRoom < 80) return null;
  const byProtein = proteinGap / BOOSTER.proteinG;
  const byKcal = kcalRoom / BOOSTER.kcal;
  const scale = clamp(Math.min(byProtein, byKcal), 0.5, 3);
  const kcal = Math.min(Math.round(BOOSTER.kcal * scale), Math.floor(kcalRoom));
  const proteinG = Math.round(BOOSTER.proteinG * scale);
  if (kcal < 80 || proteinG < 8) return null;

  const kind: MealKind = "component";
  const slot: MealSlot = "snack";
  return {
    dayIndex,
    slot,
    kind,
    title: "Skyr — protein-top",
    description: "Ekstra protein så dagen rammer dit mål. Skyr, ingen tilsat sukker.",
    ingredients: [{ name: "skyr", amount: scaleAmount(BOOSTER.grams, scale), unit: "g" }],
    steps: ["Hæld skyr i en skål og spis."],
    estKcal: kcal,
    estProteinG: proteinG,
    estCarbsG: Math.round(BOOSTER.carbsG * scale),
    estFatG: Math.round(BOOSTER.fatG * scale),
    carbDensity: "standard",
    prepMinutes: 1,
    swappable: true,
    position,
    imageUrl: null,
    imageThumbUrl: null,
    imageAttributionName: null,
    imageAttributionUrl: null,
  };
}

export function fallbackPlanNotes(weekStart: string, targets: DailyMacroTargets): string {
  return (
    `Skaleret standardplan for uge ${weekStart} — AI-udkastet nåede ikke i mål, ` +
    `så portionerne er tilpasset ${targets.kcal} kcal / ${targets.proteinG}g protein. ` +
    `MakeIt-allowlist: ingen rapsolie, intet UPF, intet tilsat sukker.`
  );
}
