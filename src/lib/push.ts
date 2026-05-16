import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/* ================================================================ *
 * VAPID setup — env vars wire the server's identity for the push
 * services. Without these, sending is a no-op and we log a warning;
 * subscriptions still get saved (so members aren't left in a broken
 * state if VAPID is added later).
 *
 *   VAPID_PUBLIC_KEY        (also exposed as NEXT_PUBLIC_VAPID_PUBLIC_KEY)
 *   VAPID_PRIVATE_KEY
 *   VAPID_SUBJECT           e.g. "mailto:hello@makeit.dk"
 * ================================================================ */

const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:hello@makeit.dk";

let vapidConfigured = false;
function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn(
      "[push] VAPID keys not configured — push send will no-op. Set VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY env vars."
    );
    return false;
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  vapidConfigured = true;
  return true;
}

export const PUSH_ENABLED = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

/* ================================================================ *
 * Payload contract — must match the service worker's push handler.
 * tag dedupes notifications client-side (same tag overwrites).
 * ================================================================ */

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/* ================================================================ *
 * Send to a single member — fans out to every saved subscription.
 *
 * Auto-cleans 410 Gone / 404 Not Found responses (member uninstalled
 * the PWA or revoked permission); leaves transient errors alone.
 * Returns the count of successful sends.
 * ================================================================ */

export async function sendPushToMember(
  memberId: string,
  payload: PushPayload
): Promise<number> {
  const supabase = await createClient();
  if (!supabase) return 0;
  return dispatchPush(supabase, memberId, payload);
}

/**
 * Same as sendPushToMember but takes an explicit Supabase client.
 * Cron jobs run without a user session, so they must pass a
 * service-role client — the cookie-aware createClient() would be
 * an anon client and RLS would hide every push_subscriptions row.
 */
export async function sendPushToMemberWithClient(
  supabase: SupabaseClient,
  memberId: string,
  payload: PushPayload
): Promise<number> {
  return dispatchPush(supabase, memberId, payload);
}

async function dispatchPush(
  supabase: SupabaseClient,
  memberId: string,
  payload: PushPayload
): Promise<number> {
  if (!ensureVapid()) return 0;

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("member_id", memberId);

  if (!subs || subs.length === 0) return 0;

  const json = JSON.stringify(payload);
  const deadIds: string[] = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          json
        );
        sent += 1;
      } catch (err: unknown) {
        const status =
          (err as { statusCode?: number } | null)?.statusCode ?? 0;
        if (status === 404 || status === 410) {
          deadIds.push(s.id);
        } else {
          console.warn("[push] send failed:", status || err);
        }
      }
    })
  );

  // Sweep dead subscriptions — if the push service told us the
  // endpoint is gone, no point keeping it. Best-effort; ignore
  // errors so a transient delete failure doesn't bubble up.
  if (deadIds.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("id", deadIds)
      .then(() => undefined, () => undefined);
  }

  return sent;
}
