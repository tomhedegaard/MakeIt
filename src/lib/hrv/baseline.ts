/**
 * HRV baseline model — pure functions computing rolling means, the Smallest
 * Worthwhile Change (SWC), warm-up state, and 5-bucket readiness classification.
 *
 * Input series are the member's chronologically-ordered `lnRmssd` values
 * (natural-log of RMSSD), one per valid measured day, most recent LAST.
 * Sick days are excluded upstream. See spec §5.
 */
import type { WarmUpState, ReadinessBucket } from "./types";

/** Number of most-recent values forming the short-term (7-day) mean. */
const SEVEN_DAY_WINDOW = 7;
/** Number of most-recent values forming the long-term (60-day) baseline. */
const SIXTY_DAY_WINDOW = 60;

/**
 * Mean of the most recent `n` values of `series` (or all values, if fewer
 * than `n` are available). Returns 0 for an empty series.
 */
export function rollingMean(series: number[], n: number): number {
  if (series.length === 0 || n <= 0) return 0;
  const window = series.slice(-n);
  const sum = window.reduce((acc, v) => acc + v, 0);
  return sum / window.length;
}

/**
 * Within-subject sample standard deviation (divide by `n - 1`) over the most
 * recent up-to-60 values. Returns 0 when fewer than 2 values are available,
 * since a sample SD is undefined for n < 2.
 */
export function withinSubjectSd(series: number[]): number {
  const window = series.slice(-SIXTY_DAY_WINDOW);
  if (window.length < 2) return 0;
  const mean = window.reduce((acc, v) => acc + v, 0) / window.length;
  const sumSquaredDev = window.reduce(
    (acc, v) => acc + (v - mean) * (v - mean),
    0,
  );
  return Math.sqrt(sumSquaredDev / (window.length - 1));
}

/**
 * Smallest Worthwhile Change = 0.5 × within-subject SD.
 */
export function computeSwc(series: number[]): number {
  return 0.5 * withinSubjectSd(series);
}

/**
 * Warm-up state derived from the count of valid readings:
 * `<7` → discovery, `7-13` → provisional, `≥14` → active.
 */
export function warmUpStateForCount(count: number): WarmUpState {
  if (count < 7) return "discovery";
  if (count < 14) return "provisional";
  return "active";
}

/**
 * Classify the 7-day mean against the 60-day baseline into one of 5 readiness
 * buckets, using SWC-scaled thresholds:
 *  - very_low:  7d-mean < baseline − 2×SWC
 *  - low:       baseline − 2×SWC ≤ 7d-mean < baseline − SWC
 *  - normal:    within ±SWC of baseline
 *  - high:      baseline + SWC < 7d-mean ≤ baseline + 2×SWC
 *  - very_high: 7d-mean > baseline + 2×SWC
 */
export function classifyReadiness(
  sevenDayMean: number,
  baseline: number,
  swc: number,
): ReadinessBucket {
  const delta = sevenDayMean - baseline;
  if (delta < -2 * swc) return "very_low";
  if (delta < -swc) return "low";
  if (delta <= swc) return "normal";
  if (delta <= 2 * swc) return "high";
  return "very_high";
}

/** Result shape consumed by the `submitHrvReading` server action (Task 9). */
export interface BaselineResult {
  rolling7dMean: number;
  baseline60dMean: number;
  swc: number;
  warmUpState: WarmUpState;
  readinessBucket: ReadinessBucket | null;
}

/**
 * Orchestrator: compute the full baseline model for a member's lnRMSSD series.
 *
 * The 7-day mean uses the most recent 7 values; the 60-day baseline uses the
 * most recent 60. `readinessBucket` is `null` unless `warmUpState === 'active'`,
 * since the comparison is only meaningful once the baseline has matured.
 */
export function computeBaseline(lnSeries: number[]): BaselineResult {
  const rolling7dMean = rollingMean(lnSeries, SEVEN_DAY_WINDOW);
  const baseline60dMean = rollingMean(lnSeries, SIXTY_DAY_WINDOW);
  const swc = computeSwc(lnSeries);
  const warmUpState = warmUpStateForCount(lnSeries.length);
  const readinessBucket =
    warmUpState === "active"
      ? classifyReadiness(rolling7dMean, baseline60dMean, swc)
      : null;

  return {
    rolling7dMean,
    baseline60dMean,
    swc,
    warmUpState,
    readinessBucket,
  };
}
