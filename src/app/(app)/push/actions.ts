"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { sendPushToMember, PUSH_ENABLED } from "@/lib/push";

/**
 * Save a Web Push subscription for the current member.
 *
 * Endpoint is unique globally — re-subscribing from the same browser
 * yields the same endpoint. We upsert by endpoint so the row is
 * refreshed (last_seen_at) without duplicating.
 */
export async function savePushSubscriptionAction(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): Promise<{ ok: boolean }> {
  if (!SUPABASE_ENABLED) return { ok: true };

  const member = await getSession();
  if (!member) return { ok: false };

  const supabase = await createClient();
  if (!supabase) return { ok: false };

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        member_id: member.id,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        user_agent: input.userAgent ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );

  if (error) {
    console.warn("[push] save subscription failed:", error.message);
    return { ok: false };
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Remove a subscription by endpoint. Member-scoped: only deletes if
 * the row belongs to the calling member (RLS enforces this anyway).
 */
export async function deletePushSubscriptionAction(input: {
  endpoint: string;
}): Promise<{ ok: boolean }> {
  if (!SUPABASE_ENABLED) return { ok: true };

  const supabase = await createClient();
  if (!supabase) return { ok: false };

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", input.endpoint);

  if (error) return { ok: false };
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Fire a test notification to the current member's subscriptions.
 * Used by the "Send testbesked" button so members can verify their
 * setup before relying on the daily check-in push.
 */
export async function sendTestPushAction(): Promise<{
  ok: boolean;
  sent: number;
  reason?: string;
}> {
  if (!PUSH_ENABLED) {
    return { ok: false, sent: 0, reason: "VAPID keys not configured" };
  }
  const member = await getSession();
  if (!member) return { ok: false, sent: 0, reason: "not authed" };

  const sent = await sendPushToMember(member.id, {
    title: "MakeIt — testbesked",
    body: "Push virker. Daglige check-in påmindelser kommer kl. 8.",
    url: "/dashboard",
    tag: "test",
  });

  return { ok: sent > 0, sent };
}
