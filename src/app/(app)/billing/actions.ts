"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe, priceIdFor, STRIPE_ENABLED, type ProductKind } from "@/lib/stripe";

async function baseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3002";
  return `${proto}://${host}`;
}

/**
 * Create a Stripe Checkout session for the given product kind and
 * redirect there. No-op in demo / non-connected mode (pushes to
 * /billing?demo=1 instead).
 */
export async function startCheckoutAction(
  formData: FormData
): Promise<void> {
  const kind = String(formData.get("kind") ?? "crew") as ProductKind;
  const stripe = getStripe();

  if (!STRIPE_ENABLED || !stripe) {
    redirect(`/billing?demo=1&kind=${kind}`);
  }

  const supabase = await createClient();
  if (!supabase) redirect("/billing?err=auth");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Resolve / create a Stripe customer for this member.
  const { data: m } = await supabase
    .from("members")
    .select("stripe_customer_id, email, handle")
    .eq("id", user.id)
    .maybeSingle();

  let customerId = m?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: m?.email ?? user.email ?? undefined,
      metadata: {
        member_id: user.id,
        handle: m?.handle ?? "",
      },
    });
    customerId = customer.id;
    await supabase
      .from("members")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const priceId = priceIdFor(kind);
  if (!priceId) redirect(`/billing?err=price&kind=${kind}`);

  const url = await baseUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { member_id: user.id, product_kind: kind },
    subscription_data: {
      metadata: { member_id: user.id, product_kind: kind },
    },
    success_url: `${url}/billing?success=1&kind=${kind}`,
    cancel_url: `${url}/billing?canceled=1`,
    allow_promotion_codes: true,
  });

  if (!session.url) redirect("/billing?err=session");
  redirect(session.url);
}

/**
 * Open the Stripe Customer Portal so the member can manage / cancel
 * their subscription.
 */
export async function openPortalAction(): Promise<void> {
  const stripe = getStripe();
  if (!STRIPE_ENABLED || !stripe) redirect("/billing?demo=1");

  const supabase = await createClient();
  if (!supabase) redirect("/billing?err=auth");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: m } = await supabase
    .from("members")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!m?.stripe_customer_id) redirect("/billing?err=customer");

  const url = await baseUrl();
  const portal = await stripe.billingPortal.sessions.create({
    customer: m.stripe_customer_id,
    return_url: `${url}/billing`,
  });

  redirect(portal.url);
}
