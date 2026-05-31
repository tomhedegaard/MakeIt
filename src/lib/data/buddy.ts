/**
 * Crew Coaching Pyramid — buddy data layer for /buddy surfaces (CC-3).
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §5, §6
 *
 * Reads the current user's active buddy pair, the buddy's profile,
 * today's readiness bucket, and the last few buddy_interactions.
 *
 * Demo-mode fallback: returns a fictional buddy ("mads_lift") so the
 * /buddy surfaces are demoable without a real pair in the DB.
 */
import "server-only";

import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import type { ReadinessBucket } from "@/lib/hrv/types";

export type BuddyInteractionKind =
  | "reaction_fire"
  | "reaction_strong"
  | "reaction_eyes"
  | "nudge_session"
  | "nudge_sleep"
  | "comment";

const INTERACTION_KINDS: readonly BuddyInteractionKind[] = [
  "reaction_fire",
  "reaction_strong",
  "reaction_eyes",
  "nudge_session",
  "nudge_sleep",
  "comment",
];

export function isBuddyInteractionKind(s: string): s is BuddyInteractionKind {
  return (INTERACTION_KINDS as readonly string[]).includes(s);
}

export interface BuddyInteractionRow {
  id: string;
  pairId: string;
  fromMember: string;
  toMember: string;
  kind: BuddyInteractionKind;
  body: string | null;
  createdAt: string;
}

export interface BuddyPairingReason {
  algo_version: string;
  score: number;
  top_factors: string[];
}

export interface BuddySummary {
  pairId: string;
  pairedAt: string;
  buddyMemberId: string;
  buddyHandle: string;
  buddyTier: string;
  buddyReadinessBucket: ReadinessBucket | null;
  pairingReason: BuddyPairingReason | null;
  recentInteractions: BuddyInteractionRow[];
}

/**
 * Demo-mode buddy — a 1-week-old pair with a small interaction
 * history. Mirrors the shape of a real buddy so the page renders
 * the same code path.
 */
function mockBuddy(currentMemberId: string): BuddySummary {
  const now = Date.now();
  return {
    pairId: "demo-pair-1",
    pairedAt: new Date(now - 7 * 86_400_000).toISOString(),
    buddyMemberId: "m-mads",
    buddyHandle: "mads_lift",
    buddyTier: "Athlete",
    buddyReadinessBucket: "normal",
    pairingReason: {
      algo_version: "v0",
      score: 78,
      top_factors: [
        "engagement_balance",
        "training_phase_offset",
        "goal_focus_alignment",
      ],
    },
    recentInteractions: [
      {
        id: "demo-i1",
        pairId: "demo-pair-1",
        fromMember: "m-mads",
        toMember: currentMemberId,
        kind: "reaction_fire",
        body: null,
        createdAt: new Date(now - 6 * 3_600_000).toISOString(),
      },
      {
        id: "demo-i2",
        pairId: "demo-pair-1",
        fromMember: currentMemberId,
        toMember: "m-mads",
        kind: "reaction_strong",
        body: null,
        createdAt: new Date(now - 26 * 3_600_000).toISOString(),
      },
      {
        id: "demo-i3",
        pairId: "demo-pair-1",
        fromMember: "m-mads",
        toMember: currentMemberId,
        kind: "comment",
        body: "Solid 5x5 i går — vi tager hill-sprints søndag, husk det 💪",
        createdAt: new Date(now - 48 * 3_600_000).toISOString(),
      },
    ],
  };
}

/**
 * Return the current authed user's active buddy pair, or null if
 * they're not paired (or not authed). Reads use the cookie-aware
 * client — buddy_pairs + buddy_interactions RLS policies grant the
 * member access to their own pair.
 */
export async function getMyBuddy(): Promise<BuddySummary | null> {
  const member = await getSession();
  if (!member) return null;
  if (!SUPABASE_ENABLED) return mockBuddy(member.id);

  const supabase = await createClient();
  if (!supabase) return mockBuddy(member.id);

  // Active pair: either side of (member_a, member_b) is the user; not yet unpaired.
  const { data: pairRows } = await supabase
    .from("buddy_pairs")
    .select("id, member_a, member_b, paired_at, pairing_reason")
    .or(`member_a.eq.${member.id},member_b.eq.${member.id}`)
    .is("unpaired_at", null)
    .limit(1);
  const pair = pairRows?.[0];
  if (!pair) return null;

  const buddyId =
    pair.member_a === member.id ? pair.member_b : pair.member_a;

  // Buddy profile.
  const { data: buddyRow } = await supabase
    .from("members")
    .select("id, handle, tier")
    .eq("id", buddyId)
    .single();
  if (!buddyRow) return null;

  // Today's readiness (UTC day) — most recent reading.
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const { data: readingRows } = await supabase
    .from("hrv_readings")
    .select("readiness_bucket")
    .eq("member_id", buddyId)
    .gte("measured_at", todayStart.toISOString())
    .order("measured_at", { ascending: false })
    .limit(1);
  const buddyReadinessBucket =
    (readingRows?.[0]?.readiness_bucket as ReadinessBucket | null) ?? null;

  // Last 3 interactions on this pair, newest first.
  const { data: interactionRows } = await supabase
    .from("buddy_interactions")
    .select("id, pair_id, from_member, to_member, kind, body, created_at")
    .eq("pair_id", pair.id)
    .order("created_at", { ascending: false })
    .limit(3);

  return {
    pairId: pair.id,
    pairedAt: pair.paired_at,
    buddyMemberId: buddyRow.id,
    buddyHandle: buddyRow.handle,
    buddyTier: buddyRow.tier,
    buddyReadinessBucket,
    pairingReason: (pair.pairing_reason as BuddyPairingReason | null) ?? null,
    recentInteractions: (interactionRows ?? []).map((r) => ({
      id: r.id,
      pairId: r.pair_id,
      fromMember: r.from_member,
      toMember: r.to_member,
      kind: r.kind as BuddyInteractionKind,
      body: r.body,
      createdAt: r.created_at,
    })),
  };
}
