import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type Stripe from "stripe";
import {
  getStripe,
  STRIPE_ENABLED,
  STRIPE_WEBHOOK_SECRET,
  type ProductKind,
} from "@/lib/stripe";
import {
  SUPABASE_ENABLED,
  SUPABASE_URL,
} from "@/lib/supabase/env";

export const runtime = "nodejs";
// Disable static rendering so we always get a fresh raw body.
export const dynamic = "force-dynamic";

/**
 * Stripe → MakeIt // HQ subscription bridge.
 * Listens for checkout completion and subscription lifecycle events,
 * upserts the matching row in public.subscriptions.
 *
 * Uses the service role on the webhook side so RLS doesn't block the
 * write. STRIPE_WEBHOOK_SECRET is required to verify the signature.
 */
export async function POST(req: NextRequest) {
  if (!STRIPE_ENABLED || !SUPABASE_ENABLED) {
    return NextResponse.json({ ok: true, skipped: "not configured" }, { status: 200 });
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ ok: false }, { status: 500 });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "no signature" }, { status: 400 });

  const raw = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "verify failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY missing — required to write subscriptions" },
      { status: 500 }
    );
  }

  // Service-role client bypasses RLS for the webhook write path.
  const supabase = createServerClient(SUPABASE_URL, serviceRoleKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const subId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      if (!subId) break;
      const sub = await stripe.subscriptions.retrieve(subId);
      await upsertSubscription(supabase, sub);
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await upsertSubscription(supabase, sub);
      break;
    }
    default:
      // Other events ignored for v1.
      break;
  }

  return NextResponse.json({ received: true });
}

type SupabaseLike = ReturnType<typeof createServerClient>;

async function upsertSubscription(supabase: SupabaseLike, sub: Stripe.Subscription) {
  const memberId =
    (sub.metadata?.member_id as string | undefined) ?? null;
  if (!memberId) return;

  const productKind =
    ((sub.metadata?.product_kind as string | undefined) ?? "crew") as ProductKind;

  const item = sub.items?.data?.[0];
  const priceId = (item?.price?.id as string | undefined) ?? null;
  const periodEndUnix =
    (item as unknown as { current_period_end?: number } | undefined)?.current_period_end;

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;

  await supabase.from("subscriptions").upsert(
    {
      member_id: memberId,
      stripe_subscription_id: sub.id,
      stripe_customer_id: customerId,
      stripe_price_id: priceId,
      product_kind: productKind,
      status: sub.status,
      current_period_end: periodEndUnix
        ? new Date(periodEndUnix * 1000).toISOString()
        : null,
      cancel_at_period_end: !!sub.cancel_at_period_end,
    },
    { onConflict: "stripe_subscription_id" }
  );
}
