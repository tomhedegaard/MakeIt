/**
 * Pure helpers for the scroll-scrubbed image sequence (A1 in the asset
 * list): a lifter under the bar whose frames follow the visitor's scroll
 * through the motor story. Kept free of DOM so the maths is testable.
 */

/**
 * How far an element has travelled through the viewport, 0 when its top
 * reaches the bottom edge and 1 when its bottom leaves the top edge.
 * Clamped, so a block that is off screen reads 0 or 1, never beyond.
 */
export function progressThrough(top: number, height: number, viewportHeight: number): number {
  const total = height + viewportHeight;
  if (total <= 0) return 0;
  const travelled = viewportHeight - top;
  return Math.min(1, Math.max(0, travelled / total));
}

/**
 * Which frame to draw for a progress value. The sequence is spread over
 * [start, end] of the progress so the lifter can hold still while the
 * block enters and leaves. Frames are 0-based and the last frame is
 * reached exactly at `end`.
 */
export function frameIndexFor(
  progress: number,
  frameCount: number,
  range: { start: number; end: number } = { start: 0.2, end: 0.8 },
): number {
  if (frameCount <= 1) return 0;
  const span = range.end - range.start;
  const local = span <= 0 ? 1 : (progress - range.start) / span;
  const clamped = Math.min(1, Math.max(0, local));
  return Math.round(clamped * (frameCount - 1));
}

/** Frame file name for an index, zero padded to three digits: `a1-squat-frame-001.webp`. */
export function frameUrl(base: string, index: number, ext = "webp"): string {
  const n = String(index + 1).padStart(3, "0");
  return `${base}-${n}.${ext}`;
}

/**
 * Frames to fetch first so the scrub never shows a blank canvas: every
 * `stride`th frame, then the rest. On a slow connection the lifter moves
 * in coarse steps before it moves smoothly.
 */
export function loadOrder(frameCount: number, stride = 8): number[] {
  const first: number[] = [];
  const rest: number[] = [];
  for (let i = 0; i < frameCount; i += 1) (i % stride === 0 ? first : rest).push(i);
  return [...first, ...rest];
}
