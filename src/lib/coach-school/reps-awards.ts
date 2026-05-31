/**
 * Crew Coaching Pyramid — Reps integration (CC-10).
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §10
 *
 * Typed wrappers around `reps_transactions` inserts for the four
 * coaching-event Reps awards we ship in v0:
 *
 *   reference_type             | delta | trigger
 *   ─────────────────────────── | ───── | ──────────────────────────
 *   lesson_completed           | +20   | First-time lesson completion
 *   coach_review_sandbox       | +10   | Sandbox review with agreement ≥ 0.8
 *   co_coach_promotion         | +200  | One-time on sandbox → live
 *   buddy_interaction_streak   | +5    | ≥3 interactions in calendar week
 *
 * Idempotency is enforced via where-not-exists on the tuple
 * (member_id, reference_type, reference_id). Pattern mirrors the
 * `hrv_first_connection` bonus in src/app/api/wearables/[provider]/
 * callback/route.ts — proven shape, reused here.
 *
 * The tier-promotion DB trigger (`bump_tier_after_reps_change`,
 * migration 0009) handles tier upgrades automatically — these
 * awards just push deltas into the ledger; we don't touch
 * members.tier directly.
 *
 * Why not legend_multiplier_bonus, coach_review_live, or
 * coach_review_munk_thumbs_up (per spec §10): all three need
 * infrastructure that doesn't exist yet (Legend tier handling
 * code-wise, member-thumbs UI, Munk-spot-check inbox). They'll
 * land in CC-10b / CC-11. Lean v0 keeps the four awards above.
 *
 * Best-effort by design: every helper returns
 * `{ ok, skipped?, reason? }` and never throws — coaching actions
 * (lesson submit, sandbox review, promote-to-live) call them
 * AFTER their own successful DB write, so a Reps-insert failure
 * shouldn't roll back the coaching event. The action logs the
 * failure for forensics.
 *
 * Module note: no `server-only` directive here because vitest
 * needs to load the pure helpers (COACHING_REPS_TABLE, isoWeekTag).
 * The Supabase-touching helpers below take a SupabaseClient as an
 * argument and never reach for env vars or singletons themselves —
 * they're only safe to call from server contexts (cron, server
 * actions), and every caller in CC-10 is exactly that.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** All Reps-emitting event types CC-10 ships. */
export type CoachingRepsRefType =
  | "lesson_completed"
  | "coach_review_sandbox"
  | "co_coach_promotion"
  | "buddy_interaction_streak";

/** Per-ref-type delta + Danish reason copy. Pure; the source of
 *  truth for the spec's award table. Public so tests can verify
 *  the deltas match the spec without spinning up Supabase. */
export const COACHING_REPS_TABLE: Record<
  CoachingRepsRefType,
  { delta: number; reason: string }
> = {
  lesson_completed: { delta: 20, reason: "Lektion gennemført" },
  coach_review_sandbox: { delta: 10, reason: "Sandbox-review matched Munk" },
  co_coach_promotion: { delta: 200, reason: "Promotion til co-coach (live)" },
  buddy_interaction_streak: {
    delta: 5,
    reason: "Buddy-streak (≥3 interaktioner / uge)",
  },
};

export interface AwardResult {
  ok: boolean;
  /** True when the row was already present and we no-opped. */
  skipped?: boolean;
  /** Machine-readable reason on !ok (e.g. "lookup-failed", "insert-failed"). */
  reason?: string;
}

/**
 * Idempotent insert into reps_transactions. Returns ok+skipped
 * when the row already exists for the (member_id, reference_type,
 * reference_id) tuple.
 *
 * NB: reference_id=null is allowed (e.g. co_coach_promotion is
 * one-time-per-member with no source row to point at). The lookup
 * handles null correctly — `.is("reference_id", null)` vs `.eq`.
 */
async function awardOnce(
  client: SupabaseClient<Database>,
  args: {
    memberId: string;
    refType: CoachingRepsRefType;
    referenceId: string | null;
  },
): Promise<AwardResult> {
  const spec = COACHING_REPS_TABLE[args.refType];

  // Lookup must distinguish null from a value — PostgREST's `.eq`
  // doesn't match null, so we branch on which builder method to use.
  const existsQuery = client
    .from("reps_transactions")
    .select("id")
    .eq("member_id", args.memberId)
    .eq("reference_type", args.refType);
  const existsResult =
    args.referenceId === null
      ? await existsQuery.is("reference_id", null).maybeSingle()
      : await existsQuery.eq("reference_id", args.referenceId).maybeSingle();

  if (existsResult.error) {
    return { ok: false, reason: `lookup-failed: ${existsResult.error.message}` };
  }
  if (existsResult.data) {
    // Already awarded — idempotent no-op.
    return { ok: true, skipped: true };
  }

  const { error: insertErr } = await client.from("reps_transactions").insert({
    member_id: args.memberId,
    delta: spec.delta,
    reason: spec.reason,
    reference_type: args.refType,
    reference_id: args.referenceId,
  });
  if (insertErr) {
    return { ok: false, reason: `insert-failed: ${insertErr.message}` };
  }
  return { ok: true };
}

/* ─────────────────────────────────────────────────────────────── *
 * Public award entry points — one per spec row. Thin wrappers so
 * callers don't have to remember reference_type spelling and so
 * the IDE narrows ref_type → delta + reason at the call site.
 * ─────────────────────────────────────────────────────────────── */

export async function awardLessonCompletion(
  client: SupabaseClient<Database>,
  args: { memberId: string; lessonId: string },
): Promise<AwardResult> {
  return awardOnce(client, {
    memberId: args.memberId,
    refType: "lesson_completed",
    referenceId: args.lessonId,
  });
}

export async function awardSandboxReview(
  client: SupabaseClient<Database>,
  args: {
    memberId: string;
    coachReviewId: string;
    /** The agreement_score from the just-inserted coach_reviews row.
     *  Spec gate: only award when ≥ 0.8. */
    agreementScore: number;
  },
): Promise<AwardResult> {
  if (args.agreementScore < 0.8) {
    return { ok: true, skipped: true, reason: "below-agreement-threshold" };
  }
  return awardOnce(client, {
    memberId: args.memberId,
    refType: "coach_review_sandbox",
    referenceId: args.coachReviewId,
  });
}

export async function awardCoCoachPromotion(
  client: SupabaseClient<Database>,
  args: { memberId: string },
): Promise<AwardResult> {
  return awardOnce(client, {
    memberId: args.memberId,
    refType: "co_coach_promotion",
    referenceId: null,
  });
}

export async function awardBuddyInteractionStreak(
  client: SupabaseClient<Database>,
  args: {
    memberId: string;
    /** ISO-week tag, e.g. "2026-W22". Becomes reference_id so the
     *  weekly cron can re-run idempotently within the same week. */
    weekIso: string;
  },
): Promise<AwardResult> {
  return awardOnce(client, {
    memberId: args.memberId,
    refType: "buddy_interaction_streak",
    referenceId: args.weekIso,
  });
}

/* ─────────────────────────────────────────────────────────────── *
 * Pure helpers — exported for tests + the buddy-streak cron.
 * ─────────────────────────────────────────────────────────────── */

/**
 * Format a Date as an ISO-week tag like "2026-W22". Used as the
 * reference_id for buddy_interaction_streak so re-runs of the
 * weekly cron within the same week dedupe automatically.
 *
 * Implementation note — ISO 8601 weeks start Monday; week 1
 * contains January 4th. The arithmetic here is the standard
 * "Thursday-in-the-week" algorithm.
 */
export function isoWeekTag(d: Date): string {
  // Clone to UTC midnight so timezone drift doesn't shift the week.
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // 0 = Sunday → treat as 7 so Mon=1..Sun=7.
  const dayNum = date.getUTCDay() || 7;
  // Shift to the Thursday of this ISO week.
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${date.getUTCFullYear()}-W${weekNo.toString().padStart(2, "0")}`;
}

/** Lower bound (Monday 00:00 UTC) of the ISO week containing `d`. */
export function isoWeekStartUtc(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - (dayNum - 1));
  return date;
}
