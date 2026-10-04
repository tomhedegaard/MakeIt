/**
 * Deterministic HRV fixtures for demo mode (no Supabase).
 *
 * Munk demos the product here — the series must look like a real member
 * with a mature personal band and one morning slightly out of band so
 * the Heart → Body engine sentence is visible.
 */
import { classifyReadiness, computeBaseline } from "./baseline";
import type { ChartReading } from "./trend-chart";
import type { ReadinessBucket } from "./types";

/** lnRMSSD ≈ 56 ms — a plausible resting baseline. */
const BASELINE_LN = 4.025;
const DAYS_STEADY = 21;

function isoDay(index: number, days: number, now: Date): string {
  // The last night is this morning, so the demo never shows a series that
  // ended weeks ago next to "I dag". Tests pass a fixed `now`.
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 5, 30));
  d.setUTCDate(d.getUTCDate() - (days - 1 - index));
  return d.toISOString();
}

function rollingMeanAt(raw: number[], i: number): number | null {
  if (i < 6) return null;
  const window = raw.slice(i - 6, i + 1);
  return window.reduce((a, b) => a + b, 0) / window.length;
}

/**
 * Build a chronological series of `days` nights.
 * The last three mornings dip so readiness lands `low` (out of band)
 * without looking like an alarm spike.
 */
export function buildDemoHrvSeries(days: number = DAYS_STEADY, now: Date = new Date()): ChartReading[] {
  const raw: number[] = [];
  for (let i = 0; i < days; i++) {
    const wave = 0.07 * Math.sin(i / 3.2) + 0.03 * Math.sin(i / 1.6);
    const dip = i >= days - 3 ? 0.18 + (i - (days - 3)) * 0.04 : 0;
    raw.push(BASELINE_LN + wave - dip);
  }

  return raw.map((lnRmssd, i) => {
    const prefix = raw.slice(0, i + 1);
    const baseline = computeBaseline(prefix);
    const rolling = rollingMeanAt(raw, i);
    const bucket: ReadinessBucket | null =
      baseline.warmUpState === "active"
        ? classifyReadiness(
            rolling ?? lnRmssd,
            baseline.baseline60dMean,
            baseline.swc,
          )
        : null;

    return {
      measuredAt: isoDay(i, days, now),
      lnRmssd,
      rolling7dMeanLnRmssd: rolling,
      baseline60dMeanLnRmssd:
        baseline.warmUpState === "active" ? baseline.baseline60dMean : null,
      baseline60dSwc: baseline.warmUpState === "active" ? baseline.swc : null,
      readinessBucket: bucket,
      isSick: false,
    };
  });
}

/** Mature 21-night series — default demo surface. */
export function demoSteadySeries(now: Date = new Date()): ChartReading[] {
  return buildDemoHrvSeries(DAYS_STEADY, now);
}

/** First-nights series for building-state tests and cold-start UI. */
export function demoBuildingSeries(now: Date = new Date()): ChartReading[] {
  return buildDemoHrvSeries(4, now);
}

export function demoEmptySeries(): ChartReading[] {
  return [];
}
