import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { MODULES, MODULE_KEYS, type ModuleKey } from "@/lib/modules";

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

/**
 * Et medlems modul-entitlements. Request-memo'iseret via React cache(),
 * så gentagne kald (layout + sider + action-guards inden for samme
 * request) kun rammer DB én gang. Demo-mode (ingen Supabase eller ingen
 * Stripe-konfiguration) → alt-true,
 * så lokal udvikling ser fuldt indhold — samme filosofi som billing.ts.
 */
export const getEntitlements = cache(
  async (memberId: string): Promise<Entitlements> => {
    // Demo-mode: uden Supabase ELLER uden Stripe-konfiguration (spejl af
    // STRIPE_ENABLED i lib/stripe.ts, læst call-time så testbarhed og
    // entitlements ikke trækker "server-only" ind) → alt låst op, så
    // gating er inert indtil betalings-setup faktisk er live.
    const stripeConfigured = Boolean(
      process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_CREW
    );
    const supabase = await createClient();
    if (!supabase || !stripeConfigured) return { ...ALL };

    const { data, error } = await supabase
      .from("member_active_subscriptions")
      .select("product_kind")
      .eq("member_id", memberId);

    if (error) {
      console.error("[entitlements] query failed:", error);
    }

    return deriveEntitlements(data ?? []);
  }
);

/**
 * Rute-guard til premium-dybe-ruter uden gratis-ækvivalent.
 * Ikke logget ind → /login. Mangler modulet → redirect til modulets
 * gratis-gulv-rute med ?upsell=<key>. Kaldes øverst i server-siden.
 */
export async function requireModuleOrRedirect(
  moduleKey: ModuleKey,
  freeFloorRoute: string = MODULES[moduleKey].route
): Promise<void> {
  const member = await getSession();
  if (!member) redirect("/login");
  const ent = await getEntitlements(member.id);
  if (!ent[moduleKey]) redirect(`${freeFloorRoute}?upsell=${moduleKey}`);
}
