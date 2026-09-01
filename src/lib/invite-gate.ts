/**
 * Closed-beta invite-gate decisions.
 *
 * SQL `is_invite_valid` is the source of truth for "is this code
 * currently usable". This module is the fail-closed policy around
 * that RPC and around consume-after-signup, so the rules can be
 * unit-tested without a database.
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
}): InviteConsumeDecision {
  const invite = args.invite ? normalizeInviteCode(args.invite) : "";

  if (args.alreadyAdmitted === true) return { action: "allow" };

  if (args.alreadyAdmitted === false) {
    if (!invite) return { action: "reject" };
    return { action: "consume", invite };
  }

  const isNew = isNewlyCreatedAuthUser(args.userCreatedAt, args.nowMs);
  if (!isNew) return { action: "allow" };
  if (!invite) return { action: "reject" };
  return { action: "consume", invite };
}
