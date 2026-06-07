/**
 * Adaptive Engine ↔ Mental Health integration (MH-6).
 *
 * Spec: docs/superpowers/specs/2026-06-07-mental-health-pillar-v0-design.md §9
 *
 * Pure functions that adjust the engine's readiness bucket and reason
 * narrative based on the 7-day mental signal. The data layer wraps
 * `buildEngineInput` to call these BEFORE the rule layer runs, so the
 * engine sees mental-aware inputs without engine.ts changes.
 *
 * Rule (from spec):
 *   - if mental_signal.low_for_days >= 3 AND existing readinessBucket
 *     is green or yellow → drop one bucket
 *   - if already red, hold
 *   - if freshness_days > 3, do nothing (data too stale to trust)
 */

import type { MentalSignal } from "./types";
import type { ReadinessBucket } from "@/lib/hrv/types";
import type { EngineInput, CandidateDecision } from "@/lib/adaptive/types";

/** Whether the mental signal is fresh enough to factor into readiness. */
export function isMentalSignalFresh(signal: MentalSignal | null): boolean {
  if (!signal) return false;
  return signal.freshness_days <= 3;
}

/** Whether the signal indicates a sustained low-energy / high-stress run. */
export function isMentalSignalLow(signal: MentalSignal | null): boolean {
  if (!signal) return false;
  return signal.low_for_days >= 3;
}

/**
 * Apply the mental-signal rule to a readiness bucket. Returns the
 * possibly-downgraded bucket plus a flag indicating whether the
 * mental rule fired.
 *
 *   green  → yellow (mental)
 *   yellow → low (mental)
 *   low    → very_low (mental)
 *   very_low → very_low (no further drop)
 *   null   → null (no signal to adjust)
 */
export function applyMentalAdjustment(
  bucket: ReadinessBucket | null,
  signal: MentalSignal | null,
): {
  bucket: ReadinessBucket | null;
  mentalFired: boolean;
} {
  if (!isMentalSignalFresh(signal) || !isMentalSignalLow(signal)) {
    return { bucket, mentalFired: false };
  }
  if (bucket === null) {
    return { bucket: null, mentalFired: false };
  }

  const next: Record<ReadinessBucket, ReadinessBucket> = {
    green: "yellow",
    yellow: "low",
    low: "very_low",
    very_low: "very_low",
  };
  const downgraded = next[bucket];
  return {
    bucket: downgraded,
    mentalFired: downgraded !== bucket || bucket === "very_low",
  };
}

/**
 * Danish narrative copy for the mental-state reason. Used in the
 * engine's "Hvad motoren så" subpanel (Open Brain UI) — mirrors the
 * tone of existing reason narratives in src/lib/adaptive/reason-narratives.ts.
 */
export function mentalReasonNarrative(signal: MentalSignal): string {
  const e = signal.energy_median_7d ?? null;
  const s = signal.stress_median_7d ?? null;
  const days = signal.low_for_days;

  if (e !== null && s !== null) {
    return (
      `Dine mind-check viser ${days} dage med lav energi (median ${e}/5) eller høj stress (median ${s}/5). ` +
      `Motoren skruer en tand ned i dag, så krop og hoved kommer i synk.`
    );
  }
  return (
    `Dine mind-check viser ${days} dage hvor signalet trækker ned. ` +
    `Motoren skruer en tand ned i dag.`
  );
}

/**
 * Return a NEW EngineInput with the readiness bucket adjusted for the
 * mental signal. Non-destructive — original input is untouched. Use
 * this in data.ts:buildEngineInput right before passing to
 * evaluateAdaptation, so the engine sees the mental-aware bucket
 * without engine.ts changes.
 */
export function mentalAwareEngineInput(
  input: EngineInput,
  signal: MentalSignal | null,
): EngineInput {
  if (!input.latestReading) return input;
  const { bucket, mentalFired } = applyMentalAdjustment(
    input.latestReading.readinessBucket,
    signal,
  );
  if (!mentalFired) return input;
  return {
    ...input,
    latestReading: {
      ...input.latestReading,
      readinessBucket: bucket,
    },
  };
}

/**
 * Decorate a CandidateDecision with the mental reason code when the
 * mental rule contributed to a non-no_change action. Engine.ts has
 * no knowledge of mental signal; this wrapper appends the reason
 * for telemetry + the Open Brain UI's narrative panel.
 */
export function decorateDecisionWithMentalReason(
  decision: CandidateDecision,
  signal: MentalSignal | null,
): CandidateDecision {
  if (!signal || !isMentalSignalFresh(signal) || !isMentalSignalLow(signal)) {
    return decision;
  }
  if (decision.action === "no_change") return decision;
  if (decision.reasons.includes("mental_state_low_energy_or_high_stress")) {
    return decision;
  }
  return {
    ...decision,
    reasons: [...decision.reasons, "mental_state_low_energy_or_high_stress"],
  };
}
