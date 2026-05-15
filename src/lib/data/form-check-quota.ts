/**
 * Form-check quota — types + tier limits + pure helpers.
 *
 * Pure module: no server-only imports. Both server and client can
 * read these. The DB-backed `getFormCheckQuota()` lives in
 * `./form-check-quota-server.ts` so importing this from a client
 * component doesn't drag the Supabase server client into the bundle.
 */
import type { Tier } from "@/lib/auth";

/**
 * Monthly form-check allowance per tier. Lifter gets none — form-check
 * is the headline Athlete-tier perk. Legend is effectively unlimited
 * but capped to prevent runaway API spend if something glitches.
 */
export const FORM_CHECK_LIMIT: Record<Tier, number> = {
  Lifter: 0,
  Athlete: 1,
  Beast: 5,
  Legend: 999,
};

export type FormCheckQuota = {
  used: number;
  limit: number;
  remaining: number;
  /** ISO timestamp of when the quota resets (first of next month, UTC). */
  resetsAt: string;
  /** True when the member has form-checks left this month. */
  hasRemaining: boolean;
};

/** Human-friendly "resets ..." string for UI. */
export function describeReset(iso: string): string {
  const target = new Date(iso);
  const now = new Date();
  const daysUntil = Math.ceil(
    (target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (daysUntil <= 1) return "nulstilles i morgen";
  if (daysUntil < 7) return `nulstilles om ${daysUntil} dage`;
  return `nulstilles d. ${target.getUTCDate()}.${target.getUTCMonth() + 1}.`;
}

export function firstOfThisMonthUtc(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  ).toISOString();
}

export function firstOfNextMonthUtc(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  ).toISOString();
}
