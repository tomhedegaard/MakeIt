/**
 * Mock auth — closed beta only. Replace with real auth later.
 * A handful of invite codes are hardcoded for the internal alpha.
 * Session is a signed-ish opaque cookie value (no real signing yet — beta).
 */
import { cookies } from "next/headers";

export const SESSION_COOKIE = "mi_session";

const INVITE_CODES = new Set([
  "ANTON-01",
  "MAKEIT-CREW",
  "FOUNDERS-2026",
  "STRAPIT-50K",
  "AMAGERBRO-169",
]);

export type Member = {
  handle: string;
  tier: "Lifter" | "Athlete" | "Beast" | "Legend";
  joinedAt: string;
};

const MOCK_MEMBER: Member = {
  handle: "anton",
  tier: "Legend",
  joinedAt: "2024-09-12",
};

export function isValidInvite(code: string) {
  return INVITE_CODES.has(code.trim().toUpperCase());
}

export async function getSession(): Promise<Member | null> {
  const c = await cookies();
  const v = c.get(SESSION_COOKIE)?.value;
  if (!v) return null;
  return MOCK_MEMBER;
}

export async function isAuthed() {
  return (await getSession()) !== null;
}
