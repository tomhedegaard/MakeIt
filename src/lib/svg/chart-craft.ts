/**
 * Shared editorial chart craft.
 *
 * Axes / grid stay monochrome. Only data-ink uses domain color
 * (docs/DOMAIN_COLOR_SYSTEM.md). Stroke weights are hairline;
 * markers stay small — not chubby SaaS dots. Band fills use the
 * 12% tint language, not solid washes.
 */

export const CHART_CRAFT = {
  gridOpacity: 0.07,
  gridWidth: 1,
  frameOpacity: 0.14,
  axisLabelOpacity: 0.4,
  bandFillOpacity: 0.1,
  meanStrokeWidth: 1.35,
  avgStrokeWidth: 1,
  pointR: 1.45,
  lastPointR: 1.7,
  sparkStrokeWidth: 1.2,
  areaFillOpacity: 0.07,
} as const;
