import { MODULE_KEYS, type ModuleKey } from "@/lib/modules";

export type Entitlements = Record<ModuleKey, boolean>;

const NONE: Entitlements = {
  train: false,
  nutrition: false,
  hrv: false,
  mind: false,
};
const ALL: Entitlements = {
  train: true,
  nutrition: true,
  hrv: true,
  mind: true,
};

/**
 * Ren afledning: aktive-sub-rækker → modul-entitlements.
 * Rækkerne kommer fra `member_active_subscriptions`, som allerede er
 * filtreret til trialing/active/past_due, så status ikke skal tjekkes her.
 * crew-bundlen ekspanderer til alle moduler; one_on_one og ukendte
 * kinds ignoreres.
 */
export function deriveEntitlements(
  rows: { product_kind: string | null }[]
): Entitlements {
  const e: Entitlements = { ...NONE };
  for (const r of rows) {
    if (r.product_kind === null) continue; // view-kolonner er nullable; null ⇒ ignorér
    if (r.product_kind === "crew") return { ...ALL };
    if ((MODULE_KEYS as readonly string[]).includes(r.product_kind)) {
      e[r.product_kind as ModuleKey] = true;
    }
  }
  return e;
}
