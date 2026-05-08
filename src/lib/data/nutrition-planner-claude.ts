/**
 * Claude Sonnet 4.6 meal-plan generator.
 *
 * STUB — full implementation lands in commit 3 of the nutrition
 * feature. Returns null so generatePlanAction falls back to the
 * deterministic mock generator. The signature is locked so the
 * action layer doesn't change when the AI body fills in.
 */
import "server-only";
import type { NutritionProfile } from "@/lib/data/nutrition";
import type { GeneratedPlanShape } from "@/lib/nutrition/mock-plan";

export type GeneratePlanOpts = {
  profile: NutritionProfile;
  weekStart: string;
};

export async function generatePlanWithClaude(opts: GeneratePlanOpts): Promise<GeneratedPlanShape | null> {
  void opts;
  return null;
}
