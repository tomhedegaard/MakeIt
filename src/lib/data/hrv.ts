import "server-only";

import { createClient } from "@/lib/supabase/server";
import { evaluateNudge, type NudgeResult } from "@/lib/hrv/nudge";
import type { CorrelationCard } from "@/lib/hrv/insights";
import {
  deriveSyncProgress,
  type HrvSyncProgress,
  type MilestoneDay,
} from "@/lib/hrv/progress";
import type { ChartReading } from "@/lib/hrv/trend-chart";
import type {
  HrvConfidence,
  HrvReading,
  HrvSource,
  ReadinessBucket,
  WarmUpState,
} from "@/lib/hrv/types";

export type ReadinessNudge = Exclude<NudgeResult, null>;
export type { HrvSyncProgress } from "@/lib/hrv/progress";

/**
 * Server-side HRV reading-history data module.
 *
 * One place for HRV pages (the daily `/hrv` view and the `/hrv/trends`
 * chart) to query a member's reading history. Per spec §5, the chart and
 * baseline only ever read the member's *primary* connection's readings.
 *
 * Demo mode (`!SUPABASE_ENABLED`, i.e. `createClient()` returns null) has
 * no HRV tables — every query degrades to an empty result.
 */

/**
 * The member's HRV readings for their current primary connection, in
 * chronological order, shaped for the trend chart.
 *
 * Two-step query: resolve the primary connection, then read its readings.
 * Demo mode, or no primary connection → `[]`.
 *
 * @param opts.rangeDays — if given, only readings measured within the last
 *   `rangeDays` days are returned.
 */
export async function getHrvReadingSeries(
  memberId: string,
  opts?: { rangeDays?: number },
): Promise<ChartReading[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data: connection } = await supabase
    .from("hrv_wearable_connections")
    .select("id")
    .eq("member_id", memberId)
    .eq("is_primary", true)
    .maybeSingle();

  if (!connection) return [];

  let query = supabase
    .from("hrv_readings")
    .select(
      "measured_at, ln_rmssd, rolling_7d_mean_lnrmssd, baseline_60d_mean_lnrmssd, baseline_60d_swc, readiness_bucket, is_sick",
    )
    .eq("connection_id", connection.id as string)
    .order("measured_at", { ascending: true });

  if (opts?.rangeDays != null) {
    const cutoff = new Date(
      Date.now() - opts.rangeDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    query = query.gte("measured_at", cutoff);
  }

  const { data: rows } = await query;

  return (rows ?? []).map((row) => ({
    measuredAt: row.measured_at as string,
    lnRmssd: row.ln_rmssd as number,
    rolling7dMeanLnRmssd:
      (row.rolling_7d_mean_lnrmssd as number | null) ?? null,
    baseline60dMeanLnRmssd:
      (row.baseline_60d_mean_lnrmssd as number | null) ?? null,
    baseline60dSwc: (row.baseline_60d_swc as number | null) ?? null,
    readinessBucket: (row.readiness_bucket as ReadinessBucket | null) ?? null,
    isSick: !!row.is_sick,
  }));
}

/**
 * The member's most recent HRV reading, or `null` if they have none.
 *
 * Extraction of the latest-reading lookup the `/hrv` page previously did
 * inline. Demo mode → `null`.
 */
export async function getLatestHrvReading(
  memberId: string,
): Promise<HrvReading | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: row } = await supabase
    .from("hrv_readings")
    .select(
      "id, member_id, measured_at, source, confidence, rmssd_ms, ln_rmssd, mean_hr_bpm, rolling_7d_mean_lnrmssd, baseline_60d_mean_lnrmssd, baseline_60d_swc, warm_up_state, readiness_bucket, timezone, is_sick",
    )
    .eq("member_id", memberId)
    .order("measured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return null;

  return {
    id: row.id as string,
    memberId: row.member_id as string,
    measuredAt: row.measured_at as string,
    source: row.source as HrvSource,
    confidence: row.confidence as HrvConfidence,
    rmssdMs: row.rmssd_ms as number,
    lnRmssd: row.ln_rmssd as number,
    meanHrBpm: (row.mean_hr_bpm as number | null) ?? null,
    rolling7dMeanLnRmssd:
      (row.rolling_7d_mean_lnrmssd as number | null) ?? null,
    baseline60dMeanLnRmssd:
      (row.baseline_60d_mean_lnrmssd as number | null) ?? null,
    baseline60dSwc: (row.baseline_60d_swc as number | null) ?? null,
    warmUpState: row.warm_up_state as WarmUpState,
    readinessBucket: (row.readiness_bucket as ReadinessBucket | null) ?? null,
    timezone: row.timezone as string,
    isSick: !!row.is_sick,
  };
}

/**
 * Returns a nudge spec for today if the member should see the V2.4
 * session readiness banner, otherwise null. Encapsulates spec §3's
 * 5 trigger conditions via the pure `evaluateNudge` helper.
 *
 * Demo / no-supabase → null.
 */
export async function getTodaysReadinessNudge(
  memberId: string,
): Promise<ReadinessNudge | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  // Three reads. Run in parallel — they are independent.
  const [
    { data: settingsRow },
    latestReading,
    { count: activeConnCount },
  ] = await Promise.all([
    supabase
      .from("hrv_settings")
      .select("session_suggestion_enabled")
      .eq("member_id", memberId)
      .maybeSingle(),
    getLatestHrvReading(memberId),
    supabase
      .from("hrv_wearable_connections")
      .select("id", { head: true, count: "exact" })
      .eq("member_id", memberId)
      .eq("status", "active"),
  ]);

  return evaluateNudge({
    sessionSuggestionEnabled:
      (settingsRow?.session_suggestion_enabled as boolean | undefined) ?? null,
    hasActiveConnection: (activeConnCount ?? 0) > 0,
    reading: latestReading
      ? {
          warmUpState: latestReading.warmUpState,
          readinessBucket: latestReading.readinessBucket,
          measuredAt: latestReading.measuredAt,
        }
      : null,
    now: new Date(),
  });
}

/**
 * Narrows a number from the DB to the literal MilestoneDay union.
 * The trigger CHECKs hrv_streak_events.milestone to (7,14,30,90),
 * so off-ladder values shouldn't exist in practice — but the
 * type system needs explicit narrowing.
 */
function asMilestoneDay(n: number): MilestoneDay | null {
  return n === 7 || n === 14 || n === 30 || n === 90 ? n : null;
}

/**
 * V2.5 — sync-streak progress for /hrv. See spec §4.3.
 *
 * Reads three cheap queries from Supabase and feeds them into the
 * pure deriveSyncProgress for the typed shape:
 *
 *   1. count(distinct (measured_at at time zone 'UTC')::date) from
 *      hrv_readings via the get_hrv_distinct_day_count RPC — the
 *      member's total distinct synced days.
 *   2. The set of milestones already paid (rows in hrv_streak_events).
 *   3. The highest-milestone row still `seen_at is null` — drives the
 *      one-shot toast on /hrv.
 *
 * Demo mode (no Supabase): returns the empty state — no special path,
 * same as a real member with zero readings.
 */
export async function getHrvSyncProgress(
  memberId: string,
): Promise<HrvSyncProgress> {
  const supabase = await createClient();
  if (!supabase) {
    return deriveSyncProgress({
      daysSynced: 0,
      paidMilestones: [],
      latestUnseen: null,
    });
  }

  // All three reads are independent — run them in parallel for
  // one round-trip latency. Mirrors getTodaysReadinessNudge.
  //
  // Error policy: only the count is "fatal" for the empty fallback
  // (without it we'd display a stale-looking 0 days alongside any
  // actually-present paid milestones, which is more confusing than
  // showing nothing). Paid/unseen errors are logged but tolerated —
  // a missing toast or progress marker is a degraded UX, not wrong
  // information.
  const [
    { data: rpcCount, error: countError },
    { data: paidRows, error: paidError },
    { data: unseenRow, error: unseenError },
  ] = await Promise.all([
    // (1) distinct-day count via the RPC added in migration 0040.
    // Postgres counts inside the DB — symmetric with the trigger's
    // own COUNT and no row-cap risk for high-N members.
    supabase.rpc("get_hrv_distinct_day_count", { p_member_id: memberId }),
    // (2) Paid milestones.
    supabase
      .from("hrv_streak_events")
      .select("milestone")
      .eq("member_id", memberId),
    // (3) Highest unseen milestone — drives the toast. Highest, not
    // lowest, so a stacked 7+14 pay shows the 14-toast.
    supabase
      .from("hrv_streak_events")
      .select("milestone, reps_awarded")
      .eq("member_id", memberId)
      .is("seen_at", null)
      .order("milestone", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (countError) {
    console.error("[getHrvSyncProgress] count RPC failed:", countError);
    return deriveSyncProgress({
      daysSynced: 0,
      paidMilestones: [],
      latestUnseen: null,
    });
  }
  const daysSynced = rpcCount ?? 0;

  if (paidError) {
    console.error("[getHrvSyncProgress] paid query failed:", paidError);
  }
  const paidMilestones: MilestoneDay[] = (paidRows ?? [])
    .map((r) => asMilestoneDay(r.milestone))
    .filter((m): m is MilestoneDay => m !== null);

  if (unseenError) {
    console.error("[getHrvSyncProgress] unseen query failed:", unseenError);
  }

  let latestUnseen: { milestone: MilestoneDay; reps: number } | null = null;
  if (unseenRow) {
    const m = asMilestoneDay(unseenRow.milestone);
    if (m !== null) {
      latestUnseen = { milestone: m, reps: unseenRow.reps_awarded };
    }
  }

  return deriveSyncProgress({ daysSynced, paidMilestones, latestUnseen });
}

/**
 * The member's lifestyle logs for today (server date, UTC), keyed by
 * `event_type`.
 *
 * Returns an `event_type` → `value` (jsonb) map so a caller can pre-fill the
 * `/hrv` lifestyle controls with whatever the member already logged today.
 * Demo mode, or no client → `{}`.
 */
export async function getTodayLifestyleLogs(
  memberId: string,
): Promise<Record<string, unknown>> {
  const supabase = await createClient();
  if (!supabase) return {};

  const today = new Date().toISOString().slice(0, 10);

  const { data: rows } = await supabase
    .from("hrv_lifestyle_logs")
    .select("event_type, value")
    .eq("member_id", memberId)
    .eq("logged_for_date", today);

  const map: Record<string, unknown> = {};
  for (const row of rows ?? []) {
    map[row.event_type as string] = row.value;
  }
  return map;
}

/** A member's stored weekly HRV insight, shaped for the `/hrv` UI. */
export interface WeeklyInsight {
  weekStart: string;
  summaryText: string;
  correlationCards: CorrelationCard[];
  claudeModelId: string;
  generatedAt: string;
}

/**
 * The member's most recent weekly insight, or `null` if they have none.
 *
 * The Sunday-evening cron is the only writer of `hrv_weekly_insights`, so
 * `correlation_cards` (jsonb) always holds the engine's exact `CorrelationCard`
 * shape — an `as` cast on read is safe. Demo mode → `null`.
 */
export async function getLatestWeeklyInsight(
  memberId: string,
): Promise<WeeklyInsight | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: row } = await supabase
    .from("hrv_weekly_insights")
    .select(
      "week_start, summary_text, correlation_cards, claude_model_id, generated_at",
    )
    .eq("member_id", memberId)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return null;

  return {
    weekStart: row.week_start as string,
    summaryText: row.summary_text as string,
    correlationCards: row.correlation_cards as unknown as CorrelationCard[],
    claudeModelId: row.claude_model_id as string,
    generatedAt: row.generated_at as string,
  };
}
