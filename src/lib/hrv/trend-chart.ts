import { smoothLinePath } from "@/lib/svg/smooth-path";
import type { ReadinessBucket } from "./types";

/** A single reading prepared for the trend chart. */
export interface ChartReading {
  measuredAt: string;
  lnRmssd: number;
  rolling7dMeanLnRmssd: number | null;
  baseline60dMeanLnRmssd: number | null;
  baseline60dSwc: number | null;
  readinessBucket: ReadinessBucket | null;
  isSick: boolean;
}

/** Pixel dimensions of the SVG viewport. */
export interface ChartViewport {
  width: number;
  height: number;
}

/** Pure-geometry model for rendering an SVG HRV trend chart. */
export interface TrendChartModel {
  isEmpty: boolean;
  points: { x: number; y: number; isSick: boolean }[];
  /** SVG path "d" string through the 7-day mean. */
  meanLinePath: string;
  baselineBand: { topY: number; bottomY: number; path: string } | null;
  /**
   * Horizontal dashed personal average (14–28d window, or the persisted
   * 60d mean when that is what the latest reading carries).
   */
  personalAvg: { y: number; path: string } | null;
  yTicks: { y: number; label: string }[];
  xTicks: { x: number; label: string }[];
}

const MARGIN = 24;
const Y_PADDING_FRACTION = 0.08;
const Y_TICK_COUNT = 4;
const MAX_X_TICKS = 5;

/** Format an ISO timestamp as a short "D/M" label. */
function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

/**
 * Build the pure-geometry model for an SVG HRV trend chart.
 *
 * Readings are assumed chronologically ordered. The function is deterministic
 * and free of DOM / time-of-day dependencies.
 */
export function buildTrendChartModel(
  readings: ChartReading[],
  viewport: ChartViewport,
): TrendChartModel {
  if (readings.length === 0) {
    return {
      isEmpty: true,
      points: [],
      meanLinePath: "",
      baselineBand: null,
      personalAvg: null,
      yTicks: [],
      xTicks: [],
    };
  }

  const { width, height } = viewport;
  const innerLeft = MARGIN;
  const innerRight = width - MARGIN;
  const innerTop = MARGIN;
  const innerBottom = height - MARGIN;
  const innerWidth = Math.max(0, innerRight - innerLeft);

  const latest = readings[readings.length - 1];

  // --- Y domain: lnRMSSD values + baseline band extremes ---
  const yValues: number[] = [];
  for (const r of readings) {
    yValues.push(r.lnRmssd);
    if (r.rolling7dMeanLnRmssd != null) yValues.push(r.rolling7dMeanLnRmssd);
  }
  if (latest.baseline60dMeanLnRmssd != null && latest.baseline60dSwc != null) {
    yValues.push(latest.baseline60dMeanLnRmssd + latest.baseline60dSwc);
    yValues.push(latest.baseline60dMeanLnRmssd - latest.baseline60dSwc);
  } else if (readings.length >= 14) {
    const window = readings.slice(-28);
    const mean =
      window.reduce((acc, r) => acc + r.lnRmssd, 0) / window.length;
    const variance =
      window.reduce((acc, r) => acc + (r.lnRmssd - mean) ** 2, 0) /
      Math.max(1, window.length - 1);
    const swc = 0.5 * Math.sqrt(variance);
    yValues.push(mean + swc, mean - swc);
  }

  let yMin = Math.min(...yValues);
  let yMax = Math.max(...yValues);
  const span = yMax - yMin;
  const pad = span === 0 ? 0.1 : span * Y_PADDING_FRACTION;
  yMin -= pad;
  yMax += pad;
  const yRange = yMax - yMin || 1;

  /** Map an lnRMSSD value to a y pixel coordinate (higher value -> smaller y). */
  function yFor(value: number): number {
    const frac = (value - yMin) / yRange;
    return innerBottom - frac * (innerBottom - innerTop);
  }

  /** Map a reading index to an x pixel coordinate. */
  function xFor(index: number): number {
    if (readings.length === 1) return innerLeft + innerWidth / 2;
    return innerLeft + (index / (readings.length - 1)) * innerWidth;
  }

  // --- Points ---
  const points = readings.map((r, i) => ({
    x: xFor(i),
    y: yFor(r.lnRmssd),
    isSick: r.isSick,
  }));

  // --- Mean line path (skip null vertices, segment gracefully) ---
  const meanLinePath = smoothLinePath(
    readings.map((r, i) =>
      r.rolling7dMeanLnRmssd == null
        ? null
        : { x: xFor(i), y: yFor(r.rolling7dMeanLnRmssd) },
    ),
  );

  // --- Baseline band (flat band from the most recent reading) ---
  let baselineBand: TrendChartModel["baselineBand"] = null;
  if (latest.baseline60dMeanLnRmssd != null && latest.baseline60dSwc != null) {
    const topY = yFor(latest.baseline60dMeanLnRmssd + latest.baseline60dSwc);
    const bottomY = yFor(latest.baseline60dMeanLnRmssd - latest.baseline60dSwc);
    const path =
      `M ${innerLeft} ${topY} ` +
      `L ${innerRight} ${topY} ` +
      `L ${innerRight} ${bottomY} ` +
      `L ${innerLeft} ${bottomY} Z`;
    baselineBand = { topY, bottomY, path };
  } else if (readings.length >= 14) {
    // Personal 14–28d window when the persisted 60d fields are not yet
    // written (demo fixtures, first steady mornings).
    const window = readings.slice(-28);
    const mean =
      window.reduce((acc, r) => acc + r.lnRmssd, 0) / window.length;
    const variance =
      window.reduce((acc, r) => acc + (r.lnRmssd - mean) ** 2, 0) /
      Math.max(1, window.length - 1);
    const swc = 0.5 * Math.sqrt(variance);
    const topY = yFor(mean + swc);
    const bottomY = yFor(mean - swc);
    const path =
      `M ${innerLeft} ${topY} ` +
      `L ${innerRight} ${topY} ` +
      `L ${innerRight} ${bottomY} ` +
      `L ${innerLeft} ${bottomY} Z`;
    baselineBand = { topY, bottomY, path };
  }

  // --- Dashed personal average (same mean the band is centred on) ---
  let personalAvg: TrendChartModel["personalAvg"] = null;
  const avgLn =
    latest.baseline60dMeanLnRmssd ??
    (readings.length >= 14
      ? readings.slice(-28).reduce((acc, r) => acc + r.lnRmssd, 0) /
        Math.min(28, readings.length)
      : null);
  if (avgLn != null) {
    const y = yFor(avgLn);
    personalAvg = {
      y,
      path: `M ${innerLeft} ${y} L ${innerRight} ${y}`,
    };
  }

  // --- Y ticks (ms-valued, inverse log) ---
  const yTicks: TrendChartModel["yTicks"] = [];
  for (let i = 0; i <= Y_TICK_COUNT; i++) {
    const lnValue = yMin + (i / Y_TICK_COUNT) * yRange;
    yTicks.push({
      y: yFor(lnValue),
      label: `${Math.round(Math.exp(lnValue))} ms`,
    });
  }

  // --- X ticks (short date labels) ---
  const xTicks: TrendChartModel["xTicks"] = [];
  const tickCount = Math.min(MAX_X_TICKS, readings.length);
  if (tickCount === 1) {
    xTicks.push({ x: xFor(0), label: shortDate(readings[0].measuredAt) });
  } else {
    for (let i = 0; i < tickCount; i++) {
      const index = Math.round((i / (tickCount - 1)) * (readings.length - 1));
      xTicks.push({
        x: xFor(index),
        label: shortDate(readings[index].measuredAt),
      });
    }
  }

  return {
    isEmpty: false,
    points,
    meanLinePath,
    baselineBand,
    personalAvg,
    yTicks,
    xTicks,
  };
}
