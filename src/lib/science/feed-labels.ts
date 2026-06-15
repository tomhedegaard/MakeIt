// src/lib/science/feed-labels.ts
// Domain labels used in the machine-readable feeds (RSS/JSON). The feed data
// is Danish, so categories use the Danish domain labels — matching the
// prototype. (UI labels go through i18n; feeds are a fixed data surface.)

import type { DomainKey } from "./config";

export const DOMAIN_LABEL: Record<DomainKey, string> = {
  mad: "Mad",
  krop: "Krop",
  sind: "Sind",
};
