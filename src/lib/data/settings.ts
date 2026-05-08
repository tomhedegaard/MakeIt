import { createClient } from "@/lib/supabase/server";

export type MemberSettings = {
  id: string;
  handle: string;
  displayName: string | null;
  email: string | null;
  bio: string | null;
  tier: string;
  joinedAt: string;
  notifFormCheckReview: boolean;
  notifMention: boolean;
  notifDigest: boolean;
  notifTierUp: boolean;
};

const MOCK_SETTINGS: MemberSettings = {
  id: "mock-munk",
  handle: "Munk",
  displayName: "Mikael Munk",
  email: "munk@nowmakeit.eu",
  bio: "Head coach for MakeIt // HQ. 1.000+ deadlifts, hadet morgen-cardio, elsker en rolig pause-bench.",
  tier: "Legend",
  joinedAt: "2024-09-12",
  notifFormCheckReview: true,
  notifMention: true,
  notifDigest: true,
  notifTierUp: true,
};

export async function getMemberSettings(memberId: string): Promise<MemberSettings | null> {
  const supabase = await createClient();
  if (!supabase) return MOCK_SETTINGS;

  const { data } = await supabase
    .from("members")
    .select(`
      id, handle, display_name, email, bio, tier, joined_at,
      notif_form_check_review, notif_mention, notif_digest, notif_tier_up
    `)
    .eq("id", memberId)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    handle: data.handle,
    displayName: data.display_name,
    email: data.email,
    bio: data.bio,
    tier: data.tier,
    joinedAt: data.joined_at,
    notifFormCheckReview: !!data.notif_form_check_review,
    notifMention: !!data.notif_mention,
    notifDigest: !!data.notif_digest,
    notifTierUp: !!data.notif_tier_up,
  };
}

export type NotifPrefKey =
  | "notifFormCheckReview"
  | "notifMention"
  | "notifDigest"
  | "notifTierUp";

const COL: Record<NotifPrefKey, string> = {
  notifFormCheckReview: "notif_form_check_review",
  notifMention: "notif_mention",
  notifDigest: "notif_digest",
  notifTierUp: "notif_tier_up",
};

/**
 * Server-side preference check. Defaults to "true" (send) on any error
 * or in demo mode — we'd rather over-deliver than silently swallow.
 */
export async function memberWantsEmail(
  memberId: string,
  pref: NotifPrefKey
): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return true;

  const { data } = await supabase
    .from("members")
    .select(COL[pref])
    .eq("id", memberId)
    .maybeSingle();

  if (!data) return true;
  const v = (data as unknown as Record<string, unknown>)[COL[pref]];
  return v !== false;
}
