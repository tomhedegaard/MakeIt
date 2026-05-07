/**
 * Stripe — env gate + lazy server client.
 *
 * The platform stays in "demo mode" when these env vars are missing,
 * mirroring the Supabase pattern. UI shows status without making any
 * real Stripe calls.
 */
import "server-only";
import Stripe from "stripe";

export const STRIPE_SECRET_KEY    = process.env.STRIPE_SECRET_KEY ?? "";
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

export const STRIPE_PRICE_CREW       = process.env.STRIPE_PRICE_CREW ?? "";
export const STRIPE_PRICE_ONE_ON_ONE = process.env.STRIPE_PRICE_ONE_ON_ONE ?? "";

export const STRIPE_ENABLED = Boolean(
  STRIPE_SECRET_KEY && STRIPE_PRICE_CREW
);

let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!STRIPE_ENABLED) return null;
  if (_stripe) return _stripe;
  _stripe = new Stripe(STRIPE_SECRET_KEY, {
    typescript: true,
  });
  return _stripe;
}

export type ProductKind = "crew" | "one_on_one";

export function priceIdFor(kind: ProductKind): string | null {
  if (kind === "crew") return STRIPE_PRICE_CREW || null;
  if (kind === "one_on_one") return STRIPE_PRICE_ONE_ON_ONE || null;
  return null;
}
