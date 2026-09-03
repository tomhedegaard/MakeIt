/**
 * Personal HRV baseline band — view-model helpers for /hrv and /hrv/trends.
 *
 * Maturity follows the existing warm-up science (`baseline.ts`):
 *   0 readings        → empty
 *   1–13 readings     → building (first milestone is 7 nights)
 *   ≥14 readings      → steady (band uses a 14–28 day personal window)
 *
 * Qualitative labels collapse the 5-bucket readiness into Ro / Midt / Lav
 * for the member-facing hero. Readiness classification itself stays in
 * `classifyReadiness` — this module only shapes display.
 */
import { computeSwc, rollingMean, warmUpStateForCount } from "./baseline";
import type { ReadinessBucket } from "./types";
import type { ChartReading } from "./trend-chart";

export type BandMaturity = "empty" | "building" | "steady";
export type QualitativeBand = "ro" | "midt" | "lav";
export type EngineCue = "below" | "above";

/** First nights that build the personal band (cold-start copy). */
export const BUILDING_NIGHTS = 7;
/** Band is only drawn once this many valid nights exist. */
export const STEADY_NIGHTS = 14;
/** Upper bound of the personal-window used for the visual band. */
export const PERSONAL_WINDOW_MAX = 28;

export type HrvBandView = {
  state: BandMaturity;
  nightsCollected: number;
  nightsNeeded: number;
  latestMs: number | null;
  avgMs: number | null;
  bandLowMs: number | null;
  bandHighMs: number | null;
  qualitative: QualitativeBand | null;
  outOfBand: boolean;
  engineCue: EngineCue | null;
  readings: ChartReading[];
};

export type BandRangeModel = {
  state: BandMaturity;
  width: number;
  height: number;
  trackY: number;
  trackX1: number;
  trackX2: number;
  band: { x: number; width: number } | null;
  avgX: number | null;
  markX: number | null;
};

const RANGE_PAD = 8;

/**
 * Collapse a 5-bucket readiness into the three-word Heart label.
 * High HRV = recovered (Ro); in-band = Midt; low HRV = Lav.
 */
export function qualitativeFromBucket(
  bucket: ReadinessBucket | null,
): QualitativeBand | null {
  if (!bucket) return null;
  if (bucket === "high" || bucket === "very_high") return "ro";
  if (bucket === "normal") return "midt";
  return "lav";
}

export function isOutOfBand(bucket: ReadinessBucket | null): boolean {
  return bucket != null && bucket !== "normal";
}

export function bandMaturityForCount(count: number): BandMaturity {
  if (count <= 0) return "empty";
  if (count < STEADY_NIGHTS) return "building";
  return "steady";
}

/** lnRMSSD → whole-millisecond RMSSD. */
export function rmssdMsFromLn(lnRmssd: number): number {
  return Math.round(Math.exp(lnRmssd));
}

/**
 * Personal-window stats from the most recent 14–28 readings.
 * Returns null until the series is long enough for a steady band.
 */
export function personalWindowStats(
  readings: ChartReading[],
): { meanLn: number; swc: number; windowDays: number } | null {
  if (readings.length < STEADY_NIGHTS) return null;
  const window = readings.slice(-PERSONAL_WINDOW_MAX);
  const series = window.map((r) => r.lnRmssd);
  return {
    meanLn: rollingMean(series, series.length),
    swc: computeSwc(series),
    windowDays: window.length,
  };
}

/**
 * Build the member-facing band view from a chronological reading series.
 * Deterministic — no clock, no I/O.
 */
export function buildHrvBandView(readings: ChartReading[]): HrvBandView {
  const count = readings.length;
  const state = bandMaturityForCount(count);
  const latest = count > 0 ? readings[count - 1] : null;
  const latestMs = latest ? rmssdMsFromLn(latest.lnRmssd) : null;
  const stats = personalWindowStats(readings);
  const avgMs = stats ? rmssdMsFromLn(stats.meanLn) : null;
  const bandLowMs = stats ? rmssdMsFromLn(stats.meanLn - stats.swc) : null;
  const bandHighMs = stats ? rmssdMsFromLn(stats.meanLn + stats.swc) : null;

  const bucket = latest?.readinessBucket ?? null;
  const qualitative =
    state === "steady" ? qualitativeFromBucket(bucket) : null;
  const outOfBand = state === "steady" && isOutOfBand(bucket);

  let engineCue: EngineCue | null = null;
  if (outOfBand && (bucket === "low" || bucket === "very_low")) {
    engineCue = "below";
  } else if (outOfBand && (bucket === "high" || bucket === "very_high")) {
    engineCue = "above";
  }

  return {
    state,
    nightsCollected: count,
    nightsNeeded: state === "building" ? BUILDING_NIGHTS : STEADY_NIGHTS,
    latestMs,
    avgMs,
    bandLowMs,
    bandHighMs,
    qualitative,
    outOfBand,
    engineCue,
    readings,
  };
}

/**
 * Compact horizontal range used on /hrv (TrendChart language, not a
 * second chart dialect): faint track, personal band fill, dashed avg,
 * today's mark.
 */
export function buildBandRangeModel(
  view: HrvBandView,
  viewport: { width: number; height: number } = { width: 280, height: 36 },
): BandRangeModel {
  const { width, height } = viewport;
  const trackY = height / 2;
  const trackX1 = RANGE_PAD;
  const trackX2 = width - RANGE_PAD;
  const inner = trackX2 - trackX1;

  if (view.state !== "steady" || view.avgMs == null || view.latestMs == null) {
    return {
      state: view.state,
      width,
      height,
      trackY,
      trackX1,
      trackX2,
      band: null,
      avgX: null,
      markX: null,
    };
  }

  const values = [view.latestMs, view.avgMs];
  if (view.bandLowMs != null) values.push(view.bandLowMs);
  if (view.bandHighMs != null) values.push(view.bandHighMs);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = span * 0.18;
  const domainMin = min - pad;
  const domainMax = max + pad;
  const domain = domainMax - domainMin || 1;

  const xFor = (ms: number) => trackX1 + ((ms - domainMin) / domain) * inner;

  const avgX = xFor(view.avgMs);
  const markX = xFor(view.latestMs);
  let band: BandRangeModel["band"] = null;
  if (view.bandLowMs != null && view.bandHighMs != null) {
    const left = xFor(view.bandLowMs);
    const right = xFor(view.bandHighMs);
    band = { x: left, width: Math.max(2, right - left) };
  }

  return {
    state: view.state,
    width,
    height,
    trackY,
    trackX1,
    trackX2,
    band,
    avgX,
    markX,
  };
}

/** Warm-up state for the same count — re-export so pages share one import. */
export { warmUpStateForCount };
