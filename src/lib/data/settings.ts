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

export type HrvConnection = {
  id: string;
  provider: string;
  status: string;
  lastSyncedAt: string | null;
  isPrimary: boolean;
};

export type HrvSettings = {
  connections: HrvConnection[];
  cycleTrackingEnabled: boolean;
};

/**
 * Resolves the member's HRV section data for the settings page:
 * their non-revoked wearable connections plus the cycle-tracking flag.
 *
 * Demo mode (`!SUPABASE_ENABLED`, i.e. no Supabase client) has no
 * connection/settings tables — returns an empty, tracking-off state.
 */
export async function getMemberHrvSettings(
  memberId: string
): Promise<HrvSettings> {
  const supabase = await createClient();
  if (!supabase) return { connections: [], cycleTrackingEnabled: false };

  const [{ data: connRows }, { data: settingsRow }] = await Promise.all([
    supabase
      .from("hrv_wearable_connections")
      .select("id, provider, status, last_synced_at, is_primary")
      .eq("member_id", memberId)
      .neq("status", "revoked")
      .order("is_primary", { ascending: false })
      .order("last_synced_at", { ascending: false }),
    supabase
      .from("hrv_settings")
      .select("cycle_tracking_enabled")
      .eq("member_id", memberId)
      .maybeSingle(),
  ]);

  const connections: HrvConnection[] = (connRows ?? []).map((row) => ({
    id: row.id as string,
    provider: row.provider as string,
    status: row.status as string,
    lastSyncedAt: (row.last_synced_at as string | null) ?? null,
    isPrimary: !!row.is_primary,
  }));

  return {
    connections,
    cycleTrackingEnabled: !!settingsRow?.cycle_tracking_enabled,
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
