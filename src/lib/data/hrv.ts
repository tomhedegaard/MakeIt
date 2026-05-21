import "server-only";

import { createClient } from "@/lib/supabase/server";
import { evaluateNudge, type NudgeResult } from "@/lib/hrv/nudge";
import type { CorrelationCard } from "@/lib/hrv/insights";
import type { ChartReading } from "@/lib/hrv/trend-chart";
import type {
  HrvConfidence,
  HrvReading,
  HrvSource,
  ReadinessBucket,
  WarmUpState,
} from "@/lib/hrv/types";

export type ReadinessNudge = Exclude<NudgeResult, null>;

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
