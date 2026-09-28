import type { CSSProperties } from "react";

/**
 * The `--fill` a `.range` slider paints in moss up to (Nord, spec §5).
 * WebKit has no native "progress" part for <input type="range">, so the
 * track draws a hard stop at this percentage; Firefox uses
 * ::-moz-range-progress and ignores it.
 */
export function rangeFill(value: number, min: number, max: number): CSSProperties {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const clamped = Math.min(100, Math.max(0, pct));
  return { "--fill": `${Math.round(clamped * 100) / 100}%` } as CSSProperties;
}
