/**
 * Auth — dual mode.
 * - When SUPABASE_ENABLED: we use Supabase Auth + the public.members table.
 * - Otherwise: we fall back to the mock invite-code/cookie session so the
 *   demo keeps working locally without a backend.
 */
import { cookies } from "next/headers";
import { createClient } from "./supabase/server";
import { SUPABASE_ENABLED } from "./supabase/env";

export const SESSION_COOKIE = "mi_session";

const MOCK_INVITES = new Set([
  "MUNK-01",
  "MAKEIT-CREW",
  "FOUNDERS-2026",
  "STRAPIT-50K",
  "AMAGERBRO-169",
]);

export type Tier = "Lifter" | "Athlete" | "Beast" | "Legend";

export type Member = {
  id: string;
  handle: string;
  displayName?: string | null;
  email?: string | null;
  tier: Tier;
  joinedAt: string;
  onboardedAt?: string | null;
  isCoach?: boolean;
};

const MOCK_MEMBER: Member = {
  id: "mock-munk",
  handle: "Munk",
  displayName: "Mikael Munk",
  email: "munk@nowmakeit.eu",
  tier: "Legend",
  joinedAt: "2024-09-12",
  onboardedAt: "2024-09-12T00:00:00Z",
  isCoach: true, // demo mode: treat MUNK-01 as the head coach
};

export function isValidMockInvite(code: string) {
  return MOCK_INVITES.has(code.trim().toUpperCase());
}

export async function getSession(): Promise<Member | null> {
  if (SUPABASE_ENABLED) {
    const supabase = await createClient();
    if (!supabase) return null;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: m } = await supabase
      .from("members")
      .select("id, handle, display_name, email, tier, joined_at, onboarded_at, is_coach")
      .eq("id", user.id)
      .maybeSingle();

    if (!m) return null;

    return {
      id: m.id,
      handle: m.handle,
      displayName: m.display_name,
      email: m.email,
      tier: m.tier as Tier,
      joinedAt: m.joined_at,
      onboardedAt: m.onboarded_at,
      isCoach: !!m.is_coach,
    };
  }

  // Demo mode — cookie-based mock. MUNK-01 acts as the head coach so
  // we can demo the /coach surfaces; other invite codes are regular crew.
  const c = await cookies();
  const v = c.get(SESSION_COOKIE)?.value;
  if (!v) return null;
  return { ...MOCK_MEMBER, isCoach: v === "MUNK-01" };
}

export async function isAuthed() {
  return (await getSession()) !== null;
}
