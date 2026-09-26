/**
 * Shared editorial chart craft.
 *
 * Axes / grid stay monochrome. Only data-ink uses domain color
 * (docs/DOMAIN_COLOR_SYSTEM.md). Stroke weights are hairline;
 * markers stay small — not chubby SaaS dots. Band fills use the
 * 12% tint language, not solid washes.
 *
 * Nord (spec §5, §11): grid and frame are the theme's own 1 px lines,
 * and axis labels are --fg-dim, so they hold AA on every surface. The
 * old "currentColor at 40 %" labels were 2,6:1 on white.
 */

export const CHART_CRAFT = {
  grid: "var(--line)",
  frame: "var(--line-strong)",
  label: "var(--fg-dim)",
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
