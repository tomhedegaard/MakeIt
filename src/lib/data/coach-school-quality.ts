/**
 * Crew Coaching Pyramid — quality-cron data layer (CC-8).
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §7
 *
 * Fetchers used by the weekly quality cron. Service-role only — the
 * cron handler authenticates with Bearer ${CRON_SECRET}, then this
 * module reads across all members without RLS partitioning.
 *
 * v0 simplifications:
 *   - `agreement_with_munk` is derived from each live co-coach's
 *     SANDBOX review history (last 50 with non-null agreement_score).
 *     Live reviews don't carry a Munk reference at write-time (see
 *     CC-5's submitLiveReviewAction jsdoc — "no Munk comparison
 *     stored at write-time — quality cron CC-8 spot-checks live
 *     decisions"). True spot-checking (re-derive a Claude reference
 *     decision for each live case) ships in CC-9's safety pass.
 *     Until then, the sandbox-history signal is the honest stand-in:
 *     every beast_live coach went through sandbox with logged
 *     agreement, and that signal degrades as their patterns drift.
 *   - `member_satisfaction` is null in v0 — the 1–5 thumbs surface
 *     ships post-CC-10. The pure decideQualityStatus handles null
 *     correctly (no 'watch' triggering possible until ratings land).
 *   - `response_time_p50_minutes` is null in v0 for the same reason
 *     — no per-decision response-time signal is captured yet.
 */
import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Window for the rolling agreement signal — must match CC-7's UI. */
export const QUALITY_ROLLING_WINDOW = 50;

/** Live co-coach + the metrics needed by decideQualityStatus + downstream actions. */
export interface LiveCoachMetrics {
  memberId: string;
  handle: string;
  /** Coach email for the demotion notification — may be null if the
   *  user signed up via an OAuth flow with no email-on-file. */
  email: string | null;
  rollingAgreement: number | null;
  reviewSampleSize: number;
  /** Live reviews submitted in the last 7 days — surfaces "active" coaches. */
  interventionCountWeek: number;
  /** v0: always null until the ratings surface ships. */
  memberSatisfaction: number | null;
  satisfactionSampleSize: number;
}

const SEVEN_DAYS_MS = 7 * 24 * 3_600_000;

/**
 * Every member with coach_tier='beast_live' (and 'legend_live' — the
 * spec treats Legends as "senior Beasts" in v0, same quality gate),
 * enriched with metrics.
 *
 * Returns [] when nobody is live yet — the cron is a no-op in that
 * case and logs accordingly.
 */
export async function getLiveCoachesMetrics(
  client?: SupabaseClient<Database>,
): Promise<LiveCoachMetrics[]> {
  const svc = client ?? createServiceClient();

  const { data: liveRows, error: liveErr } = await svc
    .from("members")
    .select("id, handle, email")
    .in("coach_tier", ["beast_live", "legend_live"]);
  if (liveErr) throw new Error(`live-coaches: ${liveErr.message}`);
  const liveCoaches = liveRows ?? [];
  if (liveCoaches.length === 0) return [];

  const liveIds = liveCoaches.map((r) => r.id as string);
  const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

  // Single round-trip: every sandbox review for every live coach
  // (newest first) AND every live review they submitted in the last
  // 7 days. We split + aggregate in JS — same shape as CC-7.
  const [sandboxRes, recentLiveRes] = await Promise.all([
    svc
      .from("coach_reviews")
      .select("reviewer_id, agreement_score, submitted_at")
      .eq("mode", "sandbox")
      .in("reviewer_id", liveIds)
      .order("submitted_at", { ascending: false }),
    svc
      .from("coach_reviews")
      .select("reviewer_id")
      .eq("mode", "live")
      .in("reviewer_id", liveIds)
      .gte("submitted_at", since),
  ]);
  if (sandboxRes.error) throw new Error(`sandbox-rows: ${sandboxRes.error.message}`);
  if (recentLiveRes.error)
    throw new Error(`recent-live-rows: ${recentLiveRes.error.message}`);

  // Group sandbox rows → first N per coach → avg of non-null scores.
  const perCoachSandbox = new Map<
    string,
    { scores: number[]; total: number }
  >();
  for (const r of sandboxRes.data ?? []) {
    const id = r.reviewer_id as string;
    const bucket = perCoachSandbox.get(id) ?? { scores: [], total: 0 };
    bucket.total += 1;
    if (
      bucket.scores.length < QUALITY_ROLLING_WINDOW &&
      r.agreement_score !== null
    ) {
      bucket.scores.push(r.agreement_score as number);
    }
    perCoachSandbox.set(id, bucket);
  }

  // Count live interventions per coach in the rolling 7-day window.
  const perCoachLive = new Map<string, number>();
  for (const r of recentLiveRes.data ?? []) {
    const id = r.reviewer_id as string;
    perCoachLive.set(id, (perCoachLive.get(id) ?? 0) + 1);
  }

  return liveCoaches.map<LiveCoachMetrics>((c) => {
    const id = c.id as string;
    const sandbox = perCoachSandbox.get(id);
    const scores = sandbox?.scores ?? [];
    const avg =
      scores.length > 0
        ? scores.reduce((acc, s) => acc + s, 0) / scores.length
        : null;
    return {
      memberId: id,
      handle: (c.handle as string) ?? "—",
      email: (c.email as string | null) ?? null,
      rollingAgreement: avg,
      reviewSampleSize: scores.length,
      interventionCountWeek: perCoachLive.get(id) ?? 0,
      memberSatisfaction: null,
      satisfactionSampleSize: 0,
    };
  });
}

/**
 * Atomic demotion: flip coach_tier from beast_live → beast_sandbox
 * and end every still-open co_coach_assignments row for the coach.
 * Returns the number of assignments closed (useful for the email
 * copy + the cron summary).
 *
 * NOTE — these two writes are NOT in a single DB transaction (the
 * Supabase JS client doesn't expose multi-statement transactions
 * over PostgREST). Order is chosen so a partial failure leaves the
 * least-bad state:
 *   1. Flip tier first → CC-7's surface immediately stops showing
 *      "Promote to live" for this Beast (they're back in sandbox).
 *   2. End assignments second → if this fails the assignments stay
 *      live, but the alert queue for those members can be picked up
 *      by other live co-coaches (RLS allows any beast_live to see
 *      assigned alerts). Surfaced via the cron summary as `failed`.
 */
export async function demoteCoach(
  coachMemberId: string,
  client?: SupabaseClient<Database>,
): Promise<{ ok: boolean; assignmentsEnded: number; reason?: string }> {
  const svc = client ?? createServiceClient();

  const { error: tierErr } = await svc
    .from("members")
    .update({ coach_tier: "beast_sandbox" })
    .eq("id", coachMemberId);
  if (tierErr) return { ok: false, assignmentsEnded: 0, reason: tierErr.message };

  const { data, error: endErr } = await svc
    .from("co_coach_assignments")
    .update({ ended_at: new Date().toISOString() })
    .eq("coach_member_id", coachMemberId)
    .is("ended_at", null)
    .select("id");
  if (endErr) return { ok: false, assignmentsEnded: 0, reason: endErr.message };

  return { ok: true, assignmentsEnded: data?.length ?? 0 };
}

/** Insert one weekly snapshot row. Numeric(3,2) columns get rounded
 *  to two decimals so the DB doesn't reject precision drift. */
export async function insertQualitySnapshot(
  row: {
    coachMemberId: string;
    agreementWithMunk: number | null;
    memberSatisfaction: number | null;
    responseTimeP50Minutes: number | null;
    interventionCountWeek: number;
    status: "healthy" | "watch" | "demoted";
    notes?: string | null;
  },
  client?: SupabaseClient<Database>,
): Promise<{ ok: boolean; reason?: string }> {
  const svc = client ?? createServiceClient();
  const round2 = (n: number | null) =>
    n === null ? null : Math.round(n * 100) / 100;

  const { error } = await svc.from("coach_quality_scores").insert({
    coach_member_id: row.coachMemberId,
    agreement_with_munk: round2(row.agreementWithMunk),
    member_satisfaction: round2(row.memberSatisfaction),
    response_time_p50_minutes: row.responseTimeP50Minutes,
    intervention_count_week: row.interventionCountWeek,
    status: row.status,
    notes: row.notes ?? null,
  });
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}
