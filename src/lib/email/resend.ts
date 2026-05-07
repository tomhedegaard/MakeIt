/**
 * Resend integration — outbound transactional email.
 *
 * Plug-in: when RESEND_API_KEY is set, transactional emails are sent.
 * Otherwise every send call is a silent no-op so demo mode stays
 * intact and review actions never fail because of missing keys.
 */
import "server-only";
import { Resend } from "resend";

export const RESEND_ENABLED = Boolean(process.env.RESEND_API_KEY);

/**
 * From-address for all outbound mail. In production: verify a domain
 * in Resend and set RESEND_FROM_EMAIL to e.g. "MakeIt // HQ <hq@nowmakeit.eu>".
 * For local dev / unverified accounts, Resend's onboarding sandbox
 * accepts mail addressed to your own account email.
 */
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "MakeIt // HQ <onboarding@resend.dev>";

/** Reply-to defaults to the head coach's address. */
const REPLY_TO = process.env.RESEND_REPLY_TO ?? "munk@nowmakeit.eu";

let _client: Resend | null = null;
function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_client) _client = new Resend(key);
  return _client;
}

export type SendResult = { ok: boolean; id?: string; skipped?: boolean };

/**
 * Generic sender. Callers should prefer typed wrappers in
 * src/lib/email/templates/*.ts so we don't sprinkle HTML across the app.
 */
export async function sendEmail(args: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<SendResult> {
  const client = getClient();
  if (!client) return { ok: false, skipped: true };

  const { data, error } = await client.emails.send({
    from: FROM_EMAIL,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
    replyTo: args.replyTo ?? REPLY_TO,
  });

  if (error) {
    console.warn("[email] send failed:", error.message ?? error);
    return { ok: false };
  }
  return { ok: true, id: data?.id };
}
