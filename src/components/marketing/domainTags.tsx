import type { ReactNode } from "react";

/**
 * Rich-text tag renderers for next-intl `t.rich` — colors a word in
 * its domain hue (docs/DOMAIN_COLOR_SYSTEM.md).
 *
 * Usage in messages:  "…tilpasser belastningen efter din <heart>HRV</heart>…"
 * Usage in components: {t.rich("intro", domainTags)}
 *
 * Dosage rule applies: tag only words that ARE domain references
 * (HRV, kost, træning/RPE, mind/søvn) — never arbitrary emphasis.
 */
export const domainTags = {
  heart: (chunks: ReactNode) => <span className="text-heart">{chunks}</span>,
  food: (chunks: ReactNode) => <span className="text-food">{chunks}</span>,
  body: (chunks: ReactNode) => <span className="text-body">{chunks}</span>,
  mind: (chunks: ReactNode) => <span className="text-mind">{chunks}</span>,
};
