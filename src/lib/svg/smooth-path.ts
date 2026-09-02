/**
 * Catmull-Rom → cubic Bézier path helpers for SVG charts.
 *
 * Contiguous vertices become C/S curves. Null / non-finite points
 * break the path so missing days are never interpolated across.
 */

export type PathPoint = { x: number; y: number };

export type SmoothPathOptions = {
  /** Decimal places in the path `d` string. Default 1. */
  digits?: number;
};

function isFinitePoint(p: PathPoint | null | undefined): p is PathPoint {
  return p != null && Number.isFinite(p.x) && Number.isFinite(p.y);
}

function fmt(n: number, digits: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return v.toFixed(digits);
}

function pt(p: PathPoint, digits: number): string {
  return `${fmt(p.x, digits)} ${fmt(p.y, digits)}`;
}

/** Split a sparse series into contiguous finite-point runs. */
export function contiguousSegments(
  points: Array<PathPoint | null | undefined>,
): PathPoint[][] {
  const segments: PathPoint[][] = [];
  let current: PathPoint[] = [];
  for (const p of points) {
    if (isFinitePoint(p)) {
      current.push(p);
    } else if (current.length) {
      segments.push(current);
      current = [];
    }
  }
  if (current.length) segments.push(current);
  return segments;
}

/**
 * Uniform Catmull-Rom cubic through P1→P2 given neighbours P0, P3.
 * Control points use the standard /6 conversion so C/S commands
 * stay G1 across adjacent segments.
 */
function cubicControls(
  p0: PathPoint,
  p1: PathPoint,
  p2: PathPoint,
  p3: PathPoint,
): { c1: PathPoint; c2: PathPoint } {
  return {
    c1: {
      x: p1.x + (p2.x - p0.x) / 6,
      y: p1.y + (p2.y - p0.y) / 6,
    },
    c2: {
      x: p2.x - (p3.x - p1.x) / 6,
      y: p2.y - (p3.y - p1.y) / 6,
    },
  };
}

function at(points: PathPoint[], i: number): PathPoint {
  if (i < 0) return points[0];
  if (i >= points.length) return points[points.length - 1];
  return points[i];
}

/** Smooth one contiguous run. 1 point → M; 2+ → M + C + S…. */
export function smoothSegmentPath(
  points: PathPoint[],
  options: SmoothPathOptions = {},
): string {
  const digits = options.digits ?? 1;
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${pt(points[0], digits)}`;

  let d = `M ${pt(points[0], digits)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const { c1, c2 } = cubicControls(
      at(points, i - 1),
      points[i],
      points[i + 1],
      at(points, i + 2),
    );
    if (i === 0) {
      d += ` C ${pt(c1, digits)} ${pt(c2, digits)} ${pt(points[i + 1], digits)}`;
    } else {
      d += ` S ${pt(c2, digits)} ${pt(points[i + 1], digits)}`;
    }
  }
  return d;
}

/**
 * Stroke path through a sparse series. Each gap (null / NaN) starts
 * a new subpath — no interpolation across missing samples.
 */
export function smoothLinePath(
  points: Array<PathPoint | null | undefined>,
  options: SmoothPathOptions = {},
): string {
  return contiguousSegments(points)
    .map((seg) => smoothSegmentPath(seg, options))
    .filter(Boolean)
    .join(" ");
}

/**
 * Closed area under each contiguous run, dropped vertically to
 * `baselineY`. Single-point runs are skipped (zero-width sliver).
 */
export function smoothAreaPath(
  points: Array<PathPoint | null | undefined>,
  baselineY: number,
  options: SmoothPathOptions = {},
): string {
  const digits = options.digits ?? 1;
  const base = fmt(Number.isFinite(baselineY) ? baselineY : 0, digits);
  return contiguousSegments(points)
    .filter((seg) => seg.length >= 2)
    .map((seg) => {
      const line = smoothSegmentPath(seg, options);
      const last = seg[seg.length - 1];
      const first = seg[0];
      return `${line} L ${fmt(last.x, digits)} ${base} L ${fmt(first.x, digits)} ${base} Z`;
    })
    .join(" ");
}
