/**
 * Last night as one curve: starts at 23:40, dips through the small
 * hours and settles by 06:45. One readiness read rather than two
 * stacked metrics. Shared by the motor's night stage (the instrument
 * the visitor scrolls through) so the landing draws the night once.
 * viewBox 0 0 1000 214.
 */
export const NIGHT_CURVE_PATH =
  "M40 67.6L50.8 66.5L61.6 66.5L72.5 66.7L83.3 64.1L94.1 60.7L104.9 62.6L115.8 61.6L126.6 63.1L137.4 62.5" +
  "L148.2 63.2L159.1 65.1L169.9 66.6L180.7 67.4L191.5 63.6L202.4 63.3L213.2 64.8L224 61.7L234.8 58.7L245.6 59.9" +
  "L256.5 62.8L267.3 64.7L278.1 66.7L288.9 66.6L299.8 68.2L310.6 68.4L321.4 68.4L332.2 66.5L343.1 63L353.9 61.3" +
  "L364.7 62.1L375.5 62.7L386.4 62.5L397.2 63.2L408 64.1L418.8 66.4L429.6 66.8L440.5 62.8L451.3 65L462.1 64.4" +
  "L472.9 63L483.8 60.8L494.6 63.4L505.4 65.2L516.2 66.8L527.1 67.3L537.9 67.6L548.7 64.8L559.5 63.5L570.4 62.6" +
  "L581.2 67.5L592 71.3L602.8 70L613.6 68.1L624.5 69.5L635.3 70.1L646.1 74.4L656.9 75.4L667.8 72.9L678.6 71.8" +
  "L689.4 71.1L700.2 69.9L711.1 73.9L721.9 77.9L732.7 80.8L743.5 80.9L754.4 80.1L765.2 78.1L776 78.1L786.8 78.8" +
  "L797.6 85.4L850 96L905 108L960 120";

/** Reference band the member's own HRV sits against, in viewBox y. */
export const NIGHT_BAND = [
  { ms: "68", y: 47.1 },
  { ms: "54", y: 73.9 },
] as const;

/**
 * Where the three readings sit on the curve (falling asleep, the HRV
 * low, waking) and when in the night they land, as a fraction of it.
 */
export const NIGHT_READINGS = [
  { key: "sleep", cx: 40, cy: 67.6, at: 0.06 },
  { key: "hrv", cx: 797.6, cy: 85.4, at: 0.66 },
  { key: "stress", cx: 960, cy: 120, at: 0.84 },
] as const;
