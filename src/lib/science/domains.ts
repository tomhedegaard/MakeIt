// src/lib/science/domains.ts
// Client-safe domain display metadata (key + signal colour + order).
// Kept separate from config.ts so client components can import the colours
// without pulling the whole pipeline config (whitelist Sets etc.) into the
// browser bundle. Human labels come from i18n (messages/*/Science.json), not
// here — these are data-domain signals. Colours follow the domain system
// (DOMAIN_COLOR_SYSTEM.md), not a hardcoded palette.

import type { DomainKey } from "./config";

export const DOMAIN_ORDER: DomainKey[] = ["mad", "krop", "sind"];

export const DOMAIN_COLOR: Record<DomainKey, string> = {
  mad: "var(--food)",
  krop: "var(--body)",
  sind: "var(--mind)",
};
