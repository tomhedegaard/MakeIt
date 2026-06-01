/**
 * Cue ↔ phase mapping.
 *
 * Each coaching cue belongs to a phase of the rep so the cue list
 * can highlight in sync with the PhaseAnimator (or, later, the demo
 * video). Coaches haven't anchored cues explicitly yet, so we infer:
 *
 *  - `cues.length === phases.length` → 1:1 mapping (cue N drives phase N)
 *  - otherwise → distribute cues evenly across the phase cycle by
 *    index proportion. With 5 cues × 3 phases:
 *      cue 0 → phase 0      (0 * 3 / 5 = 0)
 *      cue 1 → phase 0      (1 * 3 / 5 = 0.6 → 0)
 *      cue 2 → phase 1      (2 * 3 / 5 = 1.2 → 1)
 *      cue 3 → phase 1      (3 * 3 / 5 = 1.8 → 1)
 *      cue 4 → phase 2      (4 * 3 / 5 = 2.4 → 2)
 *
 * No DB migration in v1; a coach who wants tighter anchoring later
 * can ship an explicit `cue_phase_index: number[]` column without
 * the consuming components having to change shape.
 */

export function cueToPhaseIndex(
  cueIdx: number,
  cueCount: number,
  phaseCount: number,
): number {
  if (phaseCount <= 0 || cueCount <= 0) return 0;
  if (cueCount === phaseCount) return cueIdx;
  return Math.min(
    phaseCount - 1,
    Math.floor((cueIdx * phaseCount) / cueCount),
  );
}

/**
 * Precompute the phase index for every cue once per cue/phase shape.
 * Stable across rerenders when called with `useMemo([cueCount, phaseCount])`.
 */
export function buildCuePhaseMap(
  cueCount: number,
  phaseCount: number,
): number[] {
  const out = new Array<number>(cueCount);
  for (let i = 0; i < cueCount; i++) {
    out[i] = cueToPhaseIndex(i, cueCount, phaseCount);
  }
  return out;
}
