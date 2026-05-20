/**
 * HRV Coach red-flag alert engine — pure four-condition evaluator that turns
 * the last 60 days of readings plus the last 7 days of lifestyle logs into the
 * structured `AlertEvaluation` consumed by the V2.3 cron + Coach queue UI.
 *
 * Pure: no IO, no LLM, no React. See spec §8.
 *
 * Window convention: server-date calendar windows are anchored on `now` and
 * use UTC `YYYY-MM-DD` strings. "Last 7 days" is the inclusive interval
 * `[today-6, today]` (7 calendar days), and "last 60 days" is the inclusive
 * interval `[today-59, today]` (60 calendar days).
 *
 * RHR baseline-excludes-exposed: the spec is silent on whether the RHR
 * baseline window overlaps the exposed window. The engine partitions the
 * 60-day window into BASELINE = `[today-59, today-7)` and EXPOSED =
 * `[today-6, today]`, so a recent spike never contaminates its own baseline.
 * This is the more statistically defensible choice.
 */
import type {
  AlcoholDrinksValue,
  FeelingValue,
  SickValue,
  SleepHoursValue,
} from "./lifestyle";

/** Per-reading shape the engine needs. */
export interface AlertReading {
  /** Server-date slice of `measured_at` — `YYYY-MM-DD` (UTC). */
  date: string;
  warmUpState: "discovery" | "provisional" | "active";
  /** Baseline columns may be null in early-warm-up days. */
  rolling7dMeanLnRmssd: number | null;
  baseline60dMeanLnRmssd: number | null;
  baseline60dSwc: number | null;
  restingHrBpm: number | null;
}

/** Per-log shape (re-used from V2.2 InsightLog). */
export interface AlertLog {
  /** `logged_for_date` — `YYYY-MM-DD` (UTC). */
  date: string;
  eventType: string;
  /** The jsonb blob; V2.1 `validateLifestyleValue` enforces shape on write. */
  value: unknown;
}

export interface AlertConditionsMet {
  warm_up_active: boolean;
  sustained_low_readiness: { consecutive_days_low: number } | null;
  rhr_spike: {
    exposed_mean: number;
    baseline_mean: number;
    delta_pct: number;
  } | null;
  lifestyle_flags: {
    sick: boolean;
    stressed: boolean;
    short_sleep: boolean;
    high_alcohol: boolean;
  };
}

export interface AlertEvaluation {
  triggered: boolean;
  conditions_met: AlertConditionsMet;
}

export interface AlertInput {
  /** Chronological — last 60 days. Dedupe-by-date is handled internally. */
  readings: AlertReading[];
  /** Last 7 days (relative to `now`). */
  lifestyleLogs: AlertLog[];
  /** For the calendar-day windowing. */
  now: Date;
}

/** RHR spike-detection thresholds. */
const RHR_BASELINE_MIN_N = 14;
const RHR_EXPOSED_MIN_N = 3;
const RHR_SPIKE_FACTOR = 1.1; // 10% above baseline

/** Lifestyle thresholds. */
const SHORT_SLEEP_HOURS_MAX = 6; // exclusive — `< 6` is "short"
const HIGH_ALCOHOL_WEEK_SUM = 3; // inclusive — `≥ 3` over 7 days is "high"

/** Sustained-low-readiness gate. */
const SUSTAINED_LOW_MIN_DAYS = 3;

/** Milliseconds in one day. */
const MS_PER_DAY = 86_400_000;

/** `YYYY-MM-DD` (UTC) slice of `d`. */
function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Parse a `YYYY-MM-DD` string, add `n` days, return a `YYYY-MM-DD` string. */
function addDays(s: string, n: number): string {
  const ms = Date.parse(`${s}T00:00:00Z`) + n * MS_PER_DAY;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Round to 1 decimal place. */
function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/**
 * Evaluate the four red-flag conditions on the supplied readings and lifestyle
 * logs. Pure — no IO. The returned `conditions_met` sub-objects are always
 * populated whenever the data supports them; `triggered` is the AND-gate
 * across all four conditions.
 */
export function evaluateAlertConditions(
  input: AlertInput,
): AlertEvaluation {
  const { readings, lifestyleLogs, now } = input;
  const today = dateStr(now);
  const windowStart7 = addDays(today, -6); // inclusive 7-day window
  const windowStart60 = addDays(today, -59); // inclusive 60-day window

  // ── Condition 0: warm_up_active ──────────────────────────────────────────
  const latest = readings.length > 0 ? readings[readings.length - 1] : null;
  const warm_up_active = latest?.warmUpState === "active";

  // ── Condition 1: sustained_low_readiness ─────────────────────────────────
  // Dedupe by date (last wins — most recent reading per day), then sort
  // descending so index 0 is the most recent day.
  const byDate = new Map<string, AlertReading>();
  for (const r of readings) byDate.set(r.date, r);
  const distinctReadings = Array.from(byDate.values()).sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  let sustained_low_readiness:
    | { consecutive_days_low: number }
    | null;
  if (distinctReadings.length < SUSTAINED_LOW_MIN_DAYS) {
    sustained_low_readiness = null;
  } else {
    let consecutiveDaysLow = 0;
    for (const r of distinctReadings) {
      const baselineComplete =
        r.rolling7dMeanLnRmssd !== null &&
        r.baseline60dMeanLnRmssd !== null &&
        r.baseline60dSwc !== null;
      if (!baselineComplete) break;
      const threshold =
        (r.baseline60dMeanLnRmssd as number) - (r.baseline60dSwc as number);
      const isLow = (r.rolling7dMeanLnRmssd as number) < threshold;
      if (!isLow) break;
      consecutiveDaysLow++;
    }
    sustained_low_readiness = { consecutive_days_low: consecutiveDaysLow };
  }

  // ── Condition 2: rhr_spike ───────────────────────────────────────────────
  // Filter to readings with non-null restingHrBpm and within the 60-day
  // window. Partition into EXPOSED (date >= windowStart7) and BASELINE (date
  // in [windowStart60, windowStart7), i.e. the older days only) — see file
  // doc-comment for the rationale.
  const rhrReadings = readings.filter(
    (r) => r.restingHrBpm !== null && r.date >= windowStart60,
  );
  const exposedRhr: number[] = [];
  const baselineRhr: number[] = [];
  for (const r of rhrReadings) {
    const hr = r.restingHrBpm as number;
    if (r.date >= windowStart7) {
      exposedRhr.push(hr);
    } else {
      baselineRhr.push(hr);
    }
  }

  let rhr_spike:
    | { exposed_mean: number; baseline_mean: number; delta_pct: number }
    | null;
  if (
    baselineRhr.length < RHR_BASELINE_MIN_N ||
    exposedRhr.length < RHR_EXPOSED_MIN_N
  ) {
    rhr_spike = null;
  } else {
    const exposedMean =
      exposedRhr.reduce((acc, v) => acc + v, 0) / exposedRhr.length;
    const baselineMean =
      baselineRhr.reduce((acc, v) => acc + v, 0) / baselineRhr.length;
    const exposed_mean = round1(exposedMean);
    const baseline_mean = round1(baselineMean);
    const delta_pct = Math.round(
      ((exposedMean - baselineMean) / baselineMean) * 100,
    );
    rhr_spike = { exposed_mean, baseline_mean, delta_pct };
  }

  // ── Condition 3: lifestyle_flags ─────────────────────────────────────────
  const recentLogs = lifestyleLogs.filter((l) => l.date >= windowStart7);

  const sick = recentLogs.some(
    (l) =>
      l.eventType === "sick" && (l.value as SickValue).sick === true,
  );

  const stressed = recentLogs.some(
    (l) =>
      l.eventType === "feeling" &&
      (l.value as FeelingValue).state === "stressed",
  );

  // short_sleep: the most recent (by date, last-wins on ties) sleep_hours log
  // has hours < 6.
  let mostRecentSleep: { date: string; hours: number } | null = null;
  for (const l of recentLogs) {
    if (l.eventType !== "sleep_hours") continue;
    const hours = (l.value as SleepHoursValue).hours;
    if (mostRecentSleep === null || l.date >= mostRecentSleep.date) {
      mostRecentSleep = { date: l.date, hours };
    }
  }
  const short_sleep =
    mostRecentSleep !== null && mostRecentSleep.hours < SHORT_SLEEP_HOURS_MAX;

  // high_alcohol: sum of `count` across all alcohol_drinks logs in window
  // ≥ HIGH_ALCOHOL_WEEK_SUM.
  let alcoholSum = 0;
  for (const l of recentLogs) {
    if (l.eventType !== "alcohol_drinks") continue;
    alcoholSum += (l.value as AlcoholDrinksValue).count;
  }
  const high_alcohol = alcoholSum >= HIGH_ALCOHOL_WEEK_SUM;

  const lifestyle_flags = { sick, stressed, short_sleep, high_alcohol };

  // ── Triggered gate ───────────────────────────────────────────────────────
  const sustainedTruthy =
    sustained_low_readiness !== null &&
    sustained_low_readiness.consecutive_days_low >= SUSTAINED_LOW_MIN_DAYS;
  const rhrSpikeTruthy =
    rhr_spike !== null &&
    rhr_spike.exposed_mean >= RHR_SPIKE_FACTOR * rhr_spike.baseline_mean;
  const lifestyleTruthy =
    lifestyle_flags.sick ||
    lifestyle_flags.stressed ||
    lifestyle_flags.short_sleep ||
    lifestyle_flags.high_alcohol;

  const triggered =
    warm_up_active && sustainedTruthy && rhrSpikeTruthy && lifestyleTruthy;

  return {
    triggered,
    conditions_met: {
      warm_up_active,
      sustained_low_readiness,
      rhr_spike,
      lifestyle_flags,
    },
  };
}
