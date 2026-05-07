import { createClient } from "@/lib/supabase/server";
import type { ProductKind } from "@/lib/stripe";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export type ActiveSubscription = {
  productKind: ProductKind;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

/**
 * Active (not canceled) subscriptions for a member, keyed by product kind.
 * Returns null in demo mode so the UI can render a "demo · not connected"
 * state without false positives.
 */
export async function getActiveSubscriptions(
  memberId: string
): Promise<Record<ProductKind, ActiveSubscription | null> | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("member_active_subscriptions")
    .select("product_kind, status, current_period_end, cancel_at_period_end")
    .eq("member_id", memberId);

  const result: Record<ProductKind, ActiveSubscription | null> = {
    crew: null,
    one_on_one: null,
  };

  for (const r of data ?? []) {
    const kind = r.product_kind as ProductKind;
    if (kind in result) {
      result[kind] = {
        productKind: kind,
        status: r.status as SubscriptionStatus,
        currentPeriodEnd: r.current_period_end,
        cancelAtPeriodEnd: !!r.cancel_at_period_end,
      };
    }
  }

  return result;
}
