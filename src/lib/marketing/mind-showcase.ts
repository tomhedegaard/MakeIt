/**
 * Landing Sind-phone — static 14-day mind-check series so the
 * marketing sparkline does not depend on date or Supabase.
 * Scale matches MindCheckForm / MentalGraph (1–5). Stress is stored
 * raw; the sparkline inverts it (up = rolig) the same way the app does.
 */

import { smoothAreaPath, smoothLinePath } from "@/lib/svg/smooth-path";

export type ShowcaseMindPoint = {
  energy: number;
  stress: number;
  focus: number;
};

/**
 * Oldest → newest. Week-rhythm like `mockMindCheckLogs`: weekend
 * energy up, a mid-span stress dip so the three series stay readable.
 */
export const SHOWCASE_MIND_SERIES: ShowcaseMindPoint[] = [
  { energy: 3, stress: 3, focus: 4 },
  { energy: 3, stress: 4, focus: 3 },
  { energy: 4, stress: 3, focus: 4 },
  { energy: 3, stress: 3, focus: 4 },
  { energy: 2, stress: 4, focus: 3 },
  { energy: 3, stress: 3, focus: 3 },
  { energy: 4, stress: 2, focus: 4 },
  { energy: 4, stress: 2, focus: 3 },
  { energy: 3, stress: 2, focus: 4 },
  { energy: 3, stress: 2, focus: 4 },
  { energy: 4, stress: 3, focus: 5 },
  { energy: 3, stress: 3, focus: 4 },
  { energy: 4, stress: 2, focus: 4 },
  { energy: 4, stress: 2, focus: 4 },
];

export type ShowcaseMindDay = {
  days: number;
  today: ShowcaseMindPoint;
  series: ShowcaseMindPoint[];
};

export function getShowcaseMindDay(): ShowcaseMindDay {
  const series = SHOWCASE_MIND_SERIES;
  return {
    days: series.length,
    today: series[series.length - 1],
    series,
  };
}

export type SparklineLayout = {
  w: number;
  h: number;
  padL: number;
  padR: number;
  padT: number;
  padB: number;
};

/** Compact viewport for the landing phone sparkline. */
export const SHOWCASE_SPARK_LAYOUT: SparklineLayout = {
  w: 240,
  h: 88,
  padL: 16,
  padR: 6,
  padT: 8,
  padB: 10,
};

/**
 * Map a 1–5 value onto SVG y. `invert` plots (6 − v) so a low
 * stress score sits high on the chart — same convention as MentalGraph.
 */
export function sparkY(
  v: number,
  layout: SparklineLayout,
  invert = false,
): number {
  const plotted = invert ? 6 - v : v;
  const { h, padT, padB } = layout;
  return padT + ((5 - plotted) / 4) * (h - padT - padB);
}

export function sparkX(i: number, n: number, layout: SparklineLayout): number {
  const { w, padL, padR } = layout;
  const xStep = (w - padL - padR) / Math.max(1, n - 1);
  return padL + i * xStep;
}

export function sparkPoints(
  values: number[],
  layout: SparklineLayout,
  invert = false,
) {
  return values.map((v, i) => ({
    x: sparkX(i, values.length, layout),
    y: sparkY(v, layout, invert),
  }));
}

export function sparkPath(
  values: number[],
  layout: SparklineLayout,
  invert = false,
): string {
  return smoothLinePath(sparkPoints(values, layout, invert));
}

/** Area under the sparkline, dropped to the plot baseline. */
export function sparkAreaPath(
  values: number[],
  layout: SparklineLayout,
  invert = false,
): string {
  return smoothAreaPath(
    sparkPoints(values, layout, invert),
    layout.h - layout.padB,
  );
}
