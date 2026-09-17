/**
 * "I dag først" (spec 2026-09-17 §6): the fixed module order on the
 * dashboard. Today's session sits right under the greeting, then the
 * morning signal; everything else lives below the fold. The decorative
 * body map is gone. `dashboard/page.tsx` renders in this order.
 */
export const TODAY_LAYOUT = [
  "greeting",
  "todaySession",
  "morningSignal",
  "munkNote",
  "prose",
  "upcoming",
  "stats",
  "crew",
  "tierBanner",
  "installHint",
] as const;

export type TodayModule = (typeof TODAY_LAYOUT)[number];
