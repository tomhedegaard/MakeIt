/**
 * Closed-beta invite-gate decisions.
 *
 * SQL `is_invite_valid` is the source of truth for "is this code
 * currently usable". This module is the fail-closed policy around
 * that RPC, consume-after-signup, the password-signup
 * confirm-or-session decision, and returning vs new magic-link
 * send, so the rules can be unit-tested without a database.
 *
 * Demo mock codes (MUNK-01 etc.) live in `auth.ts` and must never
 * be special-cased here — connected mode only admits an RPC `true`.
 *
 * Spec: docs/superpowers/specs/2026-08-31-invite-gate-enforcement.md
 */

/** Cheap first filter. Not sufficient for connected-mode admit. */
export const INVITE_MIN_LENGTH = 4;

/**
 * How long after `auth.users.created_at` we still treat the row as
 * a signup (email-confirm / magic-link click can lag the insert).
 */
export const NEW_AUTH_USER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function hasMinimumInviteShape(raw: string): boolean {
  return normalizeInviteCode(raw).length >= INVITE_MIN_LENGTH;
}

/**
 * RPC / consume outcome: `true` | `false` | `null` (error, timeout,
 * missing client, unexpected payload). Only `true` admits.
 */
export type InviteRpcResult = boolean | null;

export function admitInviteValidation(result: InviteRpcResult): boolean {
  return result === true;
}

export function admitInviteConsume(result: InviteRpcResult): boolean {
  return result === true;
}

/**
 * Missing / unparseable `created_at` → treat as new (fail closed:
 * require a successful consume, or reject if there is no invite).
 */
export function isNewlyCreatedAuthUser(
  createdAt: string | null | undefined,
  nowMs: number,
  windowMs: number = NEW_AUTH_USER_WINDOW_MS,
): boolean {
  if (!createdAt) return true;
  const createdMs = Date.parse(createdAt);
  if (Number.isNaN(createdMs)) return true;
  return nowMs - createdMs <= windowMs;
}

export type InviteConsumeDecision =
  | { action: "consume"; invite: string }
  | { action: "allow" }
  | { action: "reject" };

/**
 * After a session exists: un-admitted users must present an invite
 * and consume it. Already-admitted members (flag or pre-migration
 * 7-day window) skip consume so returning logins do not burn codes.
 *
 * Official returning magic-link (`returningMagicLink`) is sent with
 * `shouldCreateUser: false` and no invite on the callback URL. When
 * the admitted probe is down, that path must still land — the 7-day
 * window would otherwise re-gate members who joined this week.
 */
export function decideInviteConsume(args: {
  invite: string | null;
  userCreatedAt: string | null | undefined;
  nowMs: number;
  /**
   * `true`  — members.invite_consumed_at is set (or RPC said so).
   * `false` — probed and not admitted; ignore the 7-day window.
   * `null` / omitted — probe unavailable (migration not applied,
   *           RPC down). Fall back to created_at window.
   */
  alreadyAdmitted?: boolean | null;
  /**
   * Official returning magic-link: no invite on the callback.
   * Only consulted when the admitted probe is unavailable.
   */
  returningMagicLink?: boolean;
}): InviteConsumeDecision {
  const invite = args.invite ? normalizeInviteCode(args.invite) : "";

  if (args.alreadyAdmitted === true) return { action: "allow" };

  if (args.alreadyAdmitted === false) {
    if (!invite) return { action: "reject" };
    return { action: "consume", invite };
  }

  if (args.returningMagicLink && !invite) return { action: "allow" };

  const isNew = isNewlyCreatedAuthUser(args.userCreatedAt, args.nowMs);
  if (!isNew) return { action: "allow" };
  if (!invite) return { action: "reject" };
  return { action: "consume", invite };
}

/**
 * Magic-link send: returning members do not need an invite (same
 * as password sign-in). A present invite is a signup — validate
 * then allow GoTrue to create the user. Blank invite → existing
 * Auth users only (`shouldCreateUser: false`).
 */
export type MagicLinkSendDecision =
  | { action: "reject-email" }
  | { action: "reject-invite" }
  | { action: "send-returning" }
  | { action: "send-signup"; invite: string };

export function decideMagicLinkSend(args: {
  email: string;
  invite: string | null;
}): MagicLinkSendDecision {
  const email = args.email.trim().toLowerCase();
  if (!email) return { action: "reject-email" };

  const invite = args.invite ? normalizeInviteCode(args.invite) : "";
  if (!invite) return { action: "send-returning" };
  if (!hasMinimumInviteShape(invite)) return { action: "reject-invite" };
  return { action: "send-signup", invite };
}

/**
 * `signInWithOtp` error after the invite decision. Returning
 * (`createUser: false`) + GoTrue refused to create → honest
 * "new accounts need an invite", not a silent sent-wall.
 */
export type MagicLinkOtpClass = "sent" | "otp" | "need_invite";

export function classifyMagicLinkOtpError(
  error: { message?: string; code?: string; status?: number } | null,
  createUser: boolean,
): MagicLinkOtpClass {
  if (!error) return "sent";

  const message = error.message ?? "";
  const code = (error.code ?? "").toLowerCase();
  const status = error.status ?? 0;

  if (!createUser && isOtpSignupDisabled(message, code)) {
    return "need_invite";
  }

  const isHardFail =
    status === 422 ||
    status === 400 ||
    /invalid|forbidden|not allowed|disabled/i.test(message);

  return isHardFail ? "otp" : "sent";
}

function isOtpSignupDisabled(message: string, code: string): boolean {
  if (
    code === "otp_disabled" ||
    code === "signup_disabled" ||
    code === "user_not_found"
  ) {
    return true;
  }
  return /signups? not allowed|user not found|shouldcreateuser/i.test(message);
}

/**
 * After invite-validated `signUp`: the invite is the closed-beta gate.
 * A session means confirm-email is off (or already satisfied). No
 * session + identities means GoTrue created a real user and is
 * waiting on confirm — we auto-confirm that user. Empty identities
 * is the anti-enumeration stub for an email that already exists.
 */
export type PasswordSignupAuthUser = {
  id: string;
  identities?: readonly unknown[] | null;
};

export type PasswordSignupNext =
  | { action: "admit-session"; userId: string }
  | { action: "confirm-and-signin"; userId: string }
  | { action: "exists" }
  | { action: "fail" };

export function decidePasswordSignupNext(args: {
  user: PasswordSignupAuthUser | null | undefined;
  session: { access_token?: string } | null | undefined;
}): PasswordSignupNext {
  const user = args.user;
  if (!user?.id) return { action: "fail" };
  if (args.session) return { action: "admit-session", userId: user.id };
  if (Array.isArray(user.identities) && user.identities.length === 0) {
    return { action: "exists" };
  }
  return { action: "confirm-and-signin", userId: user.id };
}
