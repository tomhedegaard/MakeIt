/**
 * Coach-facing nutrition adherence digest. Computes for a single
 * member, over the last N days:
 *
 *   - meals_logged   number of nutrition_logs rows
 *   - meals_planned  number of nutrition_meals rows scheduled in
 *                    the window (excluding skip-days)
 *   - adherence_pct  logged / planned, clamped to [0..100]
 *   - protein_avg_g  estimated daily protein from logs
 *   - weight_delta   week-over-week delta from getWeightTrend
 *   - suggestedAction text — surface what the coach should consider
 *                            ("Tom missed 3 dinners, encourage")
 *
 * Used by /coach/members/[id] to render an "Adherence" section
 * coaches can scan before reaching out. Doesn't write — read-only
 * digest. Future: roll up across the crew in a weekly email.
 */
import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getWeightTrend } from "@/lib/data/weight";

export type AdherenceDigest = {
  windowDays: number;
  mealsLogged: number;
  mealsPlanned: number;
  /** % of planned meals that were logged (eaten or skipped). 0-100. */
  adherencePct: number;
  weightDeltaKg: number | null;
  skipDaysCount: number;
  suggestedAction: string | null;
};

export async function getMemberAdherence(
  memberId: string,
  windowDays = 7,
): Promise<AdherenceDigest> {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - windowDays);
  const sinceIso = since.toISOString();
  const sinceDateIso = sinceIso.slice(0, 10);

  if (!supabase) {
    return {
      windowDays,
      mealsLogged: 0,
      mealsPlanned: 0,
      adherencePct: 0,
      weightDeltaKg: null,
      skipDaysCount: 0,
      suggestedAction: null,
    };
  }

  // Three parallel queries: logged meals, skipped days, weight trend.
  // Planned-meal count is derived from the current plan + window.
  const [logsRes, skipsRes, trend] = await Promise.all([
    supabase
      .from("nutrition_logs")
      .select("id, status")
      .eq("member_id", memberId)
      .gte("logged_for_date", sinceDateIso),
    supabase
      .from("nutrition_skip_days")
      .select("id")
      .eq("member_id", memberId)
      .gte("skip_date", sinceDateIso),
    getWeightTrend(memberId),
  ]);

  const mealsLogged = (logsRes.data ?? []).length;
  const skipDaysCount = (skipsRes.data ?? []).length;

  // Planned-meal count for the window: assume member.mealsPerDay
  // (or 3 fallback) × (window minus skip days). This is a heuristic
  // — exact computation would query nutrition_meals scheduled-for
  // each date, but we don't store per-meal scheduled_for; the plan
  // is week-aligned. Heuristic is fine for coach-facing summary.
  const { data: profile } = await supabase
    .from("nutrition_profiles")
    .select("meals_per_day")
    .eq("member_id", memberId)
    .maybeSingle();
  const mealsPerDay = (profile as { meals_per_day?: number } | null)?.meals_per_day ?? 3;
  const effectiveDays = Math.max(0, windowDays - skipDaysCount);
  const mealsPlanned = effectiveDays * mealsPerDay;

  const adherencePct =
    mealsPlanned > 0
      ? Math.min(100, Math.round((mealsLogged / mealsPlanned) * 100))
      : 0;

  // Heuristic action prompt for the coach. Keep it pragmatic —
  // adherence <50% triggers outreach, >85% triggers praise, mid-range
  // says "no action needed."
  let suggestedAction: string | null = null;
  if (mealsPlanned > 0) {
    if (adherencePct < 50) {
      suggestedAction = "Lav adherence — overvej en check-in besked";
    } else if (adherencePct >= 85) {
      suggestedAction = "Stærk uge — send anerkendelse";
    }
  }
  // Weight-direction sanity check augments the prompt
  if (trend.deltaKg !== null && Math.abs(trend.deltaKg) > 1.0) {
    suggestedAction =
      (suggestedAction ? suggestedAction + " · " : "") +
      `Stort vægt-skift (${trend.deltaKg > 0 ? "+" : ""}${trend.deltaKg.toFixed(1)} kg/uge) — tjek macro-target`;
  }

  return {
    windowDays,
    mealsLogged,
    mealsPlanned,
    adherencePct,
    weightDeltaKg: trend.deltaKg,
    skipDaysCount,
    suggestedAction,
  };
}
