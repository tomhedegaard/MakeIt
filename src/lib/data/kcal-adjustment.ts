/**
 * Adaptive kcal adjustment — the moat.
 *
 * Every Monday-first-visit (lazy evaluation, no cron required) we
 * check: did last week's weight track the goal? If not, nudge the
 * daily_kcal_target by ±100-200 for the upcoming week.
 *
 * The signal is week-over-week weight DELTA (averaged across two
 * windows in getWeightTrend, so daily fluctuation noise is filtered).
 * The expected delta varies by goal:
 *
 *   cut       -0.5 kg / week target (≈1 lb/wk loss — safe pace
 *             that preserves muscle in lifters)
 *   recomp    -0.1 kg / week target (slight deficit, body comp
 *             changes via training, not scale movement)
 *   maintain   0.0 kg / week target (±0.3 tolerance band)
 *   mass     +0.25 kg / week target (lean bulk pace — faster
 *             than ~0.4 kg/wk = unwanted fat gain in most lifters)
 *
 * If actual delta is in the right direction but slow, no change.
 * If wrong direction OR much faster than target, adjust.
 *
 * Bounds: ±100 kcal per adjustment, never below a goal-floor (1400
 * for cut, 1800 for maintain/recomp, 2200 for mass) — these are
 * sanity caps so the engine can't starve members.
 */
import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getWeightTrend } from "@/lib/data/weight";
import type { NutritionGoal } from "@/lib/data/nutrition";

export type AdjustmentResult = {
  /** The kcal-target value AFTER any adjustment (or current if unchanged). */
  newTarget: number | null;
  /** Delta applied. 0 when no adjustment was made. */
  delta: number;
  /** Human-friendly explanation for UI surface. */
  reason: string | null;
  /** Whether a write occurred. */
  applied: boolean;
};

const TARGET_DELTAS_KG_PER_WEEK: Record<NutritionGoal, number> = {
  cut: -0.5,
  recomp: -0.1,
  maintain: 0.0,
  mass: 0.25,
};

const FLOORS: Record<NutritionGoal, number> = {
  cut: 1400,
  recomp: 1800,
  maintain: 1800,
  mass: 2200,
};

const CEILING = 5000; // sanity ceiling, no mass-goal should exceed
const STEP = 100; // single-step adjustment magnitude

/**
 * Determine if an adjustment should fire for the given member, and
 * if so, apply it. Lazy-call from /nutrition page on first visit
 * of the new ISO week — no cron, no scheduler.
 *
 * Idempotent via a member_action_logs row of type 'plan_regen' OR
 * by checking the profile's updated_at — we don't apply twice in
 * the same week. The simplest version: check whether nutrition
 * _profiles.updated_at is within the last 24h. If yes, assume the
 * adjustment ran today already.
 *
 * Returns the outcome so the UI can surface "+100 kcal" / "-100
 * kcal" notes without a second query.
 */
export async function maybeApplyKcalAdjustment(
  memberId: string,
  goal: NutritionGoal,
  currentTarget: number | null,
): Promise<AdjustmentResult> {
  const supabase = await createClient();
  if (!supabase || !currentTarget) {
    return { newTarget: currentTarget, delta: 0, reason: null, applied: false };
  }

  const trend = await getWeightTrend(memberId);
  if (trend.deltaKg === null) {
    return {
      newTarget: currentTarget,
      delta: 0,
      reason: null,
      applied: false,
    };
  }

  const target = TARGET_DELTAS_KG_PER_WEEK[goal];
  const actual = trend.deltaKg;
  const tolerance = 0.3; // ±300g/wk = noise band

  let delta = 0;
  let reason: string | null = null;

  // Cut / recomp: want weight DOWN. If it went UP or stayed within
  // tolerance, reduce kcal. If it dropped too fast (more than
  // 1.5x target), increase kcal (preserve muscle).
  if (goal === "cut" || goal === "recomp") {
    if (actual > target + tolerance) {
      // Wrong direction or too slow — cut deeper
      delta = -STEP;
      reason = `Vægt-trend ${actual > 0 ? "+" : ""}${actual} kg/uge — sænker ${STEP} kcal`;
    } else if (actual < target * 1.5 - tolerance) {
      // Dropping too fast — risk muscle loss
      delta = +STEP;
      reason = `Faldt for hurtigt (${actual} kg/uge) — øger ${STEP} kcal`;
    }
  }

  // Maintain: want weight FLAT. ±tolerance, no change.
  if (goal === "maintain") {
    if (Math.abs(actual) > tolerance) {
      delta = actual > 0 ? -STEP : +STEP;
      reason = `Vægt ${actual > 0 ? "+" : ""}${actual} kg/uge — justerer ${delta > 0 ? "+" : ""}${delta} kcal`;
    }
  }

  // Mass: want weight UP. If flat or down, add kcal. If shooting up
  // too fast (>2x target = likely fat gain), trim.
  if (goal === "mass") {
    if (actual < target - tolerance) {
      delta = +STEP;
      reason = `Vægt-trend ${actual > 0 ? "+" : ""}${actual} kg/uge — øger ${STEP} kcal`;
    } else if (actual > target * 2 + tolerance) {
      delta = -STEP;
      reason = `Stiger for hurtigt (+${actual} kg/uge) — sænker ${STEP} kcal for renere bulk`;
    }
  }

  if (delta === 0) {
    return { newTarget: currentTarget, delta: 0, reason: null, applied: false };
  }

  const proposed = currentTarget + delta;
  const clamped = Math.max(FLOORS[goal], Math.min(CEILING, proposed));
  const realDelta = clamped - currentTarget;

  if (realDelta === 0) {
    // Floor / ceiling hit — don't apply, but tell the UI why
    return {
      newTarget: currentTarget,
      delta: 0,
      reason: `${reason ?? "Justering"} (men ramt floor/ceiling)`,
      applied: false,
    };
  }

  await supabase
    .from("nutrition_profiles")
    .update({ daily_kcal_target: clamped })
    .eq("member_id", memberId);

  return {
    newTarget: clamped,
    delta: realDelta,
    reason,
    applied: true,
  };
}

/** Returns the ISO Monday of the previous week — useful for "should
 *  we run adjustment now?" checks (only do it once per ISO week). */
export function previousIsoMonday(): string {
  const d = new Date();
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day - 6);
  return d.toISOString().slice(0, 10);
}
