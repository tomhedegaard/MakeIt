/**
 * MakeIt Ung — the pure rules (spec 2026-09-27-makeit-ung-design.md).
 *
 * Age, invitation tokens and the two consent forms. No I/O, so every
 * rule is unit-tested; the server-only half is guardianship.ts.
 */
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

/** First version: 15–17 (Toms beslutning 1). */
export const YOUTH_MIN_AGE = 15;
export const YOUTH_MAX_AGE = 17;

/** An invitation is valid for a week. */
export const INVITE_TTL_DAYS = 7;

/** Whole years between a birth date (YYYY-MM-DD) and a day. */
export function ageOn(birthDate: string, today: Date = new Date()): number {
  const [y, m, d] = birthDate.split("-").map(Number);
  if (!y || !m || !d) return Number.NaN;
  let age = today.getUTCFullYear() - y;
  const beforeBirthday = today.getUTCMonth() + 1 < m || (today.getUTCMonth() + 1 === m && today.getUTCDate() < d);
  if (beforeBirthday) age--;
  return age;
}

export function isYouthAge(birthDate: string, today: Date = new Date()): boolean {
  const age = ageOn(birthDate, today);
  return Number.isFinite(age) && age >= YOUTH_MIN_AGE && age <= YOUTH_MAX_AGE;
}

/** The day the young member turns 18 (spec 2.5: switch to an adult account). */
export function eighteenthBirthday(birthDate: string): string {
  const [y, m, d] = birthDate.split("-");
  return `${Number(y) + 18}-${m}-${d}`;
}

/** 32 random bytes, URL-safe. Only its hash is stored. */
export function newInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function inviteExpiry(now: Date = new Date()): string {
  return new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const checked = z.literal("on");

/** The guardian's form on /ung. */
export const GuardianInviteSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  email: z.string().trim().toLowerCase().email().max(254),
  birthDate: isoDate,
  consentRecovery: z.boolean(),
  consentMind: z.boolean(),
  /** "Jeg er fyldt 18 og har forældremyndigheden over …" */
  declaration: checked,
});

/** The young member's form on the invitation page. */
export const YouthAcceptSchema = z.object({
  token: z.string().min(20).max(100),
  password: z.string().min(8).max(200),
  consentRecovery: z.boolean(),
  consentMind: z.boolean(),
  /** "Jeg har læst, hvad MakeIt Ung gør, og hvornår min forælder får besked." */
  consent: checked,
});

export type GuardianInvite = z.infer<typeof GuardianInviteSchema>;
export type YouthAccept = z.infer<typeof YouthAcceptSchema>;

/** An area is on only when BOTH the guardian and the young member said yes. */
export function effectiveConsent(guardian: boolean, youth: boolean): boolean {
  return guardian && youth;
}
