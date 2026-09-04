/**
 * First-visit gate for /nutrition → /nutrition/setup.
 *
 * A profile is "fresh" when there is no plan, no weigh-in, and the
 * defaults from getOrCreateNutritionProfile have not been replaced
 * (goal still maintain, no kcal target). Used so the page can
 * redirect before the heavy fetches — and so tests can lock the rule.
 */

export function isNutritionProfileFresh(input: {
  plan: unknown | null;
  latestWeight: unknown | null;
  profile: { goal?: string | null; dailyKcalTarget?: number | null } | null;
}): boolean {
  return (
    !input.plan &&
    !input.latestWeight &&
    (!input.profile?.goal || input.profile.goal === "maintain") &&
    !input.profile?.dailyKcalTarget
  );
}
