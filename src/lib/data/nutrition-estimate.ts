/**
 * HQ meal estimate — the pure half (spec 2026-09-27 del A).
 *
 * Schemas for the two Claude calls, the server-side checks that keep a
 * model answer honest (totals are recomputed from the items; the kcal
 * interval must contain the total) and portion scaling. The daily cap
 * lives in rate-limits.ts (action "meal_estimate").
 * No I/O here, so every rule is unit-tested.
 *
 * Health rules (spec §S): an estimate is never a verdict. Nothing in
 * these types carries a score, a "good/bad" or a "remaining" framing.
 */
import { z } from "zod";

/** Portion stepper on the approve step. 1 = what HQ saw. */
export const PORTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export type Portion = (typeof PORTIONS)[number];

/* ---------------------------------------------------------------- *
 * Call 1: what is on the plate?
 * ---------------------------------------------------------------- */

export const BoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
});

export const QuestionSchema = z.object({
  id: z.string().min(1).max(20),
  prompt: z.string().min(3).max(140),
  options: z.array(z.string().min(1).max(60)).max(3),
  box: BoxSchema.nullable(),
  where: z.string().max(80).nullable(),
});

export const IdentifySchema = z.object({
  foodVisible: z.boolean(),
  questions: z.array(QuestionSchema).max(3),
});

export type MealQuestion = z.infer<typeof QuestionSchema>;
export type IdentifyResult = z.infer<typeof IdentifySchema>;

/* ---------------------------------------------------------------- *
 * Call 2: the estimate
 * ---------------------------------------------------------------- */

export const ItemSchema = z.object({
  name: z.string().min(1).max(80),
  grams: z.number().min(0).max(3000),
  kcal: z.number().min(0).max(5000),
  proteinG: z.number().min(0).max(400),
  carbsG: z.number().min(0).max(800),
  fatG: z.number().min(0).max(400),
});

export const EstimateSchema = z.object({
  assumption: z.string().min(5).max(160),
  confidence: z.enum(["high", "medium", "low"]),
  confidenceReason: z.string().min(5).max(140),
  items: z.array(ItemSchema).min(1).max(15),
  kcalRange: z.object({ low: z.number().min(0), high: z.number().min(0) }),
});

export type EstimateItem = z.infer<typeof ItemSchema>;
export type RawEstimate = z.infer<typeof EstimateSchema>;

export type Totals = { kcal: number; proteinG: number; carbsG: number; fatG: number };

/** What the member sees and approves. */
export type MealEstimate = {
  assumption: string;
  confidence: "high" | "medium" | "low";
  confidenceReason: string;
  items: EstimateItem[];
  totals: Totals;
  kcalRange: { low: number; high: number };
};

const round = (n: number) => Math.round(n);
/** kcal are shown to the nearest 10 (spec A.2). */
export const roundKcal = (n: number) => Math.round(n / 10) * 10;

export function sumItems(items: EstimateItem[]): Totals {
  return items.reduce<Totals>(
    (t, i) => ({
      kcal: t.kcal + i.kcal,
      proteinG: t.proteinG + i.proteinG,
      carbsG: t.carbsG + i.carbsG,
      fatG: t.fatG + i.fatG,
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

/**
 * Turn a model answer into what the member sees, or null if the answer
 * contradicts itself. Totals are always the sum of the items (the model
 * never gets to state a total), and the interval must contain the total
 * and be ordered — otherwise the answer is rejected and the sheet falls
 * back to manual entry.
 */
export function finalizeEstimate(raw: RawEstimate): MealEstimate | null {
  const items = raw.items.map((i) => ({
    ...i,
    grams: round(i.grams),
    kcal: round(i.kcal),
    proteinG: round(i.proteinG),
    carbsG: round(i.carbsG),
    fatG: round(i.fatG),
  }));
  const totals = sumItems(items);
  const low = round(raw.kcalRange.low);
  const high = round(raw.kcalRange.high);
  if (totals.kcal <= 0) return null;
  if (low > high) return null;
  if (totals.kcal < low || totals.kcal > high) return null;
  return {
    assumption: raw.assumption.trim(),
    confidence: raw.confidence,
    confidenceReason: raw.confidenceReason.trim(),
    items,
    totals,
    kcalRange: { low, high },
  };
}

/** Scale every number (items, totals, interval) by a portion factor. */
export function scaleEstimate(est: MealEstimate, portion: number): MealEstimate {
  if (portion === 1) return est;
  const items = est.items.map((i) => ({
    ...i,
    grams: round(i.grams * portion),
    kcal: round(i.kcal * portion),
    proteinG: round(i.proteinG * portion),
    carbsG: round(i.carbsG * portion),
    fatG: round(i.fatG * portion),
  }));
  return {
    ...est,
    items,
    totals: sumItems(items),
    kcalRange: { low: round(est.kcalRange.low * portion), high: round(est.kcalRange.high * portion) },
  };
}

/* ---------------------------------------------------------------- *
 * The approve step → server
 * ---------------------------------------------------------------- */

/** What the client sends when the member approves. Numbers may be edited. */
export const ApprovedSchema = z.object({
  source: z.enum(["hq_photo", "hq_text"]),
  label: z.string().max(200).nullable(),
  kcal: z.number().int().min(1).max(10000),
  proteinG: z.number().int().min(0).max(500),
  carbsG: z.number().int().min(0).max(1000),
  fatG: z.number().int().min(0).max(500),
  confidence: z.enum(["high", "medium", "low"]),
  kcalLow: z.number().int().min(0).max(10000),
  kcalHigh: z.number().int().min(0).max(10000),
  items: z.array(ItemSchema).max(15),
  edited: z.boolean(),
});

export type ApprovedEstimate = z.infer<typeof ApprovedSchema>;

/**
 * Open to coaches now; to every member once the 30-meal evaluation has
 * passed and NUTRITION_ESTIMATE_ENABLED=1 is set (spec A.2).
 */
export function mealEstimateEnabled(flag: string | undefined, isCoach: boolean | undefined): boolean {
  return flag === "1" || isCoach === true;
}
