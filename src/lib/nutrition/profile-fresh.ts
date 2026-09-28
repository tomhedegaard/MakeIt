/**
 * First-visit gate for /nutrition.
 *
 * A profile is "fresh" when there is no plan, no weigh-in, and the
 * defaults from getOrCreateNutritionProfile have not been replaced
 * (goal still maintain, no kcal target). The page renders the setup
 * wizard in place when this is true — a server redirect() after the
 * gate fetch paints an empty stub on client navigations.
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
