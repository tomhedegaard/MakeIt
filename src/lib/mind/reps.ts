/**
 * Mental Health Pillar (Søjle 5) — Reps integration.
 *
 * Spec: docs/superpowers/specs/2026-06-07-mental-health-pillar-v0-design.md §12
 *
 * Mirrors the awardOnce / awardLessonCompletion pattern from CC-10
 * (src/lib/coach-school/reps-awards.ts) — idempotent inserts into
 * reps_transactions keyed on (member_id, reference_type, reference_id).
 *
 * The tier-promotion DB trigger (`bump_tier_after_reps_change`,
 * migration 0009) auto-promotes tier when balance crosses a threshold,
 * so we just push deltas; we never touch members.tier directly.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * ISO week tag YYYY-WW for idempotency keys. Same week → same tag,
 * regardless of timezone (UTC anchor).
 */
export function isoWeekTagUtc(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-${String(weekNum).padStart(2, "0")}`;
}

export type MindRepsRefType =
  | "mind_check_streak"
  | "mental_session_completed"
  | "journal_entry"
  | "mental_buddy_interaction"
  | "cirkel_participation"
  | "mental_milestone_30d"
  | "mental_milestone_90d";

export const MIND_REPS_TABLE: Record<
  MindRepsRefType,
  Record<string, { delta: number; reason: string }>
> = {
  mind_check_streak: {
    "3d": { delta: 5, reason: "Mind-check stribe — 3 dage" },
    "7d": { delta: 20, reason: "Mind-check stribe — 7 dage" },
    "30d": { delta: 100, reason: "Mind-check stribe — 30 dage" },
    "90d": { delta: 300, reason: "Mind-check stribe — 90 dage" },
    "180d": { delta: 700, reason: "Mind-check stribe — 180 dage" },
  },
  mental_session_completed: {
    hero: { delta: 10, reason: "Mental session gennemført" },
    personal: { delta: 5, reason: "Daglig mental session" },
  },
  journal_entry: {
    daily: { delta: 5, reason: "Journal-post" },
  },
  mental_buddy_interaction: {
    weekly: { delta: 3, reason: "Mental check-in med buddy" },
  },
  cirkel_participation: {
    post: { delta: 10, reason: "Cirkel-post" },
    reaction: { delta: 1, reason: "Cirkel-reaktion" },
  },
  mental_milestone_30d: {
    once: { delta: 50, reason: "30 dages mental engagement" },
  },
  mental_milestone_90d: {
    once: { delta: 200, reason: "90 dages mental engagement" },
  },
};

export interface AwardResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
}

async function awardOnce(
  client: SupabaseClient<Database>,
  args: {
    memberId: string;
    refType: MindRepsRefType;
    referenceId: string;
    delta: number;
    reason: string;
  },
): Promise<AwardResult> {
  const { data: existing, error: lookupErr } = await client
    .from("reps_transactions")
    .select("id")
    .eq("member_id", args.memberId)
    .eq("reference_type", args.refType)
    .eq("reference_id", args.referenceId)
    .maybeSingle();

  if (lookupErr) {
    return { ok: false, reason: `lookup-failed: ${lookupErr.message}` };
  }
  if (existing) {
    return { ok: true, skipped: true };
  }

  const { error: insertErr } = await client.from("reps_transactions").insert({
    member_id: args.memberId,
    delta: args.delta,
    reason: args.reason,
    reference_type: args.refType,
    reference_id: args.referenceId,
  });

  if (insertErr) {
    return { ok: false, reason: `insert-failed: ${insertErr.message}` };
  }
  return { ok: true };
}

/** Award journal-entry Reps. Idempotent per journal entry row. */
export async function awardJournalEntry(
  client: SupabaseClient<Database>,
  args: { memberId: string; journalEntryId: string },
): Promise<AwardResult> {
  const spec = MIND_REPS_TABLE.journal_entry.daily;
  if (!spec) return { ok: false, reason: "spec-missing" };
  return awardOnce(client, {
    memberId: args.memberId,
    refType: "journal_entry",
    referenceId: args.journalEntryId,
    delta: spec.delta,
    reason: spec.reason,
  });
}

/**
 * Award a mind-check streak milestone. referenceId = `${memberId}-${streakDays}`
 * so re-awarding the same milestone is a no-op even across cron runs.
 */
export async function awardMindCheckStreak(
  client: SupabaseClient<Database>,
  args: { memberId: string; milestone: 3 | 7 | 30 | 90 | 180 },
): Promise<AwardResult> {
  const key = `${args.milestone}d`;
  const spec = MIND_REPS_TABLE.mind_check_streak[key];
  if (!spec) return { ok: false, reason: "spec-missing" };
  return awardOnce(client, {
    memberId: args.memberId,
    refType: "mind_check_streak",
    referenceId: `${args.memberId}-${key}`,
    delta: spec.delta,
    reason: spec.reason,
  });
}

/** Award a mental session completion. Idempotent per completion row. */
export async function awardMentalSessionCompletion(
  client: SupabaseClient<Database>,
  args: { memberId: string; completionId: string; isHero: boolean },
): Promise<AwardResult> {
  const spec =
    MIND_REPS_TABLE.mental_session_completed[args.isHero ? "hero" : "personal"];
  if (!spec) return { ok: false, reason: "spec-missing" };
  return awardOnce(client, {
    memberId: args.memberId,
    refType: "mental_session_completed",
    referenceId: args.completionId,
    delta: spec.delta,
    reason: spec.reason,
  });
}

/**
 * Award a weekly cirkel-participation Rep. Idempotent on the ISO week
 * tag — re-running in the same week is a no-op.
 */
export async function awardCirkelPost(
  client: SupabaseClient<Database>,
  args: { memberId: string; postId: string },
): Promise<AwardResult> {
  const spec = MIND_REPS_TABLE.cirkel_participation.post;
  if (!spec) return { ok: false, reason: "spec-missing" };
  return awardOnce(client, {
    memberId: args.memberId,
    refType: "cirkel_participation",
    referenceId: args.postId,
    delta: spec.delta,
    reason: spec.reason,
  });
}

/**
 * Award the 30-day mental engagement milestone. One-time per member.
 */
export async function awardMentalMilestone30d(
  client: SupabaseClient<Database>,
  args: { memberId: string },
): Promise<AwardResult> {
  const spec = MIND_REPS_TABLE.mental_milestone_30d.once;
  if (!spec) return { ok: false, reason: "spec-missing" };
  return awardOnce(client, {
    memberId: args.memberId,
    refType: "mental_milestone_30d",
    referenceId: args.memberId,
    delta: spec.delta,
    reason: spec.reason,
  });
}

/**
 * Award the 90-day mental engagement milestone. One-time per member.
 */
export async function awardMentalMilestone90d(
  client: SupabaseClient<Database>,
  args: { memberId: string },
): Promise<AwardResult> {
  const spec = MIND_REPS_TABLE.mental_milestone_90d.once;
  if (!spec) return { ok: false, reason: "spec-missing" };
  return awardOnce(client, {
    memberId: args.memberId,
    refType: "mental_milestone_90d",
    referenceId: args.memberId,
    delta: spec.delta,
    reason: spec.reason,
  });
}
