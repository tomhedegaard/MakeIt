/**
 * FAQ entry keys in display order. The "show all" count is
 * `FAQ_ITEM_KEYS.length` so the button cannot drift from the list.
 */
export const FAQ_ITEM_KEYS = [
  "advanced",
  "oneRm",
  "cancel",
  "vacation",
  "responseTime",
  "pause",
  "irl",
  "cheaper",
  "wearables",
  "hrvScore",
  "weeklyInsight",
  "hrvPrivacy",
  "dataDirection",
  "offPlanNutrition",
  "openBrainWhy",
  "coCoach",
  "hrvSharing",
  "optOutAdaptive",
] as const;

export type FaqItemKey = (typeof FAQ_ITEM_KEYS)[number];
