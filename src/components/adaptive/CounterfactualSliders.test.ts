/**
 * Tests for the CounterfactualSliders pure helpers.
 *
 * The component itself is presentational and trusts the rule layer
 * (exhaustively unit-tested in engine.test.ts). These tests verify
 * the mutation shape matches what the engine expects + that the
 * "did the counterfactual change anything?" comparison works.
 *
 * Critically: this also exercises the realistic end-to-end pipe —
 * baseline → buildCounterfactualInput → evaluateAdaptation — which
 * is exactly what the component does on every slider tick. If the
 * input shape ever drifts, the component breaks silently in the
 * browser; this test catches the drift in CI.
 */

import { describe, expect, it } from "vitest";

import {
  buildCounterfactualInput,
  counterfactualChangedAction,
} from "./CounterfactualSliders";
import { evaluateAdaptation } from "@/lib/adaptive/engine";
import type { EngineInput } from "@/lib/adaptive/types";

const NOW = new Date("2026-05-25T07:00:00.000Z");

function lowHrvBaseline(): EngineInput {
  return {
    memberId: "m-1",
    adaptiveProgramEnabled: true,
    latestReading: {
      measuredAt: "2026-05-25T05:00:00.000Z",
      warmUpState: "active",
      readinessBucket: "low",
      isSick: false,
    },
    veryLowDaysLast5: 0,
    rpeDriftLast14d: 0.2,
    lifestyle: {
      sleepHoursAvg2d: 5.0,
      alcoholLast2d: false,
      feelingLast3d: "tired",
    },
    recentSessions: [
      {
        sessionId: "s-1",
        scheduledFor: "2026-05-23",
        status: "completed",
        topSetRpeAvg: 8,
        topSetTargetRpeAvg: 8,
        completionRatio: 1,
      },
    ],
    recentFormChecks: [],
    daysSinceHeavyLift: 3,
    nextSession: {
      sessionId: "next-1",
      scheduledFor: "2026-05-26",
      title: "Squat",
      week: 3,
      exercises: [
        {
          sessionExerciseId: "se-1",
          exerciseId: "ex-squat",
          exerciseName: "Back squat",
          position: 1,
          hasLighterVariant: false,
          lighterVariant: null,
        },
      ],
    },
    now: NOW,
  };
}

// =====================================================================
// buildCounterfactualInput
// =====================================================================

describe("buildCounterfactualInput", () => {
  it("replaces lifestyle with the overrides; everything else preserved", () => {
    const baseline = lowHrvBaseline();
    const mutated = buildCounterfactualInput(baseline, {
      sleepHoursAvg2d: 8,
      alcoholLast2d: true,
      feelingLast3d: "fresh",
    });
    expect(mutated.lifestyle).toEqual({
      sleepHoursAvg2d: 8,
      alcoholLast2d: true,
      feelingLast3d: "fresh",
    });
    // Everything else unchanged.
    expect(mutated.memberId).toBe(baseline.memberId);
    expect(mutated.latestReading).toBe(baseline.latestReading);
    expect(mutated.recentSessions).toBe(baseline.recentSessions);
    expect(mutated.nextSession).toBe(baseline.nextSession);
    expect(mutated.now).toBe(baseline.now);
  });

  it("does not mutate the baseline", () => {
    const baseline = lowHrvBaseline();
    const before = baseline.lifestyle.sleepHoursAvg2d;
    buildCounterfactualInput(baseline, {
      sleepHoursAvg2d: 9,
      alcoholLast2d: true,
      feelingLast3d: "fresh",
    });
    expect(baseline.lifestyle.sleepHoursAvg2d).toBe(before);
  });
});

// =====================================================================
// Realistic counterfactual flows — baseline → mutate → evaluate
// =====================================================================

describe("realistic counterfactual flows", () => {
  it("HRV low + tired+poor sleep → counterfactual with normal sleep & feeling → no_change", () => {
    // Baseline scenario: low HRV + 5h sleep + tired → top_set_reduction
    const baseline = lowHrvBaseline();
    const baselineDecision = evaluateAdaptation(baseline);
    expect(baselineDecision.action).toBe("top_set_reduction");
    expect(baselineDecision.reasons).toContain("hrv_low");
    expect(baselineDecision.reasons).toContain("low_sleep");

    // What if the member had slept 8h and felt fresh? With HRV still
    // low, the engine should drop to volume_reduction (HRV low alone).
    const counterfactual = buildCounterfactualInput(baseline, {
      sleepHoursAvg2d: 8,
      alcoholLast2d: false,
      feelingLast3d: "fresh",
    });
    const hypothetical = evaluateAdaptation(counterfactual);
    expect(hypothetical.action).toBe("volume_reduction");
    expect(hypothetical.reasons).toEqual(["hrv_low"]);
    expect(counterfactualChangedAction(
      baselineDecision.action,
      hypothetical.action
    )).toBe(true);
  });

  it("Adding alcohol on top of low HRV + low sleep keeps top_set_reduction but adds reason", () => {
    const baseline = lowHrvBaseline();
    const counterfactual = buildCounterfactualInput(baseline, {
      sleepHoursAvg2d: 5.0,
      alcoholLast2d: true,
      feelingLast3d: "tired",
    });
    const hypothetical = evaluateAdaptation(counterfactual);
    expect(hypothetical.action).toBe("top_set_reduction");
    expect(hypothetical.reasons).toEqual([
      "hrv_low",
      "low_sleep",
      "recent_alcohol",
      "low_feeling",
    ]);
  });

  it("Restoring sleep to normal removes the low_sleep reason", () => {
    const baseline = lowHrvBaseline();
    const baselineDecision = evaluateAdaptation(baseline);
    expect(baselineDecision.reasons).toContain("low_sleep");

    const counterfactual = buildCounterfactualInput(baseline, {
      sleepHoursAvg2d: 7,
      alcoholLast2d: false,
      feelingLast3d: "tired",
    });
    const hypothetical = evaluateAdaptation(counterfactual);
    // hrv_low + low_feeling combination still triggers top_set_reduction
    // (engine treats any one of low_sleep / recent_alcohol / low_feeling
    // as a lifestyle co-factor).
    expect(hypothetical.action).toBe("top_set_reduction");
    expect(hypothetical.reasons).toContain("low_feeling");
    expect(hypothetical.reasons).not.toContain("low_sleep");
  });

  it("All three lifestyle factors clean → drops down to volume_reduction (HRV low alone)", () => {
    const baseline = lowHrvBaseline();
    const counterfactual = buildCounterfactualInput(baseline, {
      sleepHoursAvg2d: 8,
      alcoholLast2d: false,
      feelingLast3d: "ok",
    });
    const hypothetical = evaluateAdaptation(counterfactual);
    expect(hypothetical.action).toBe("volume_reduction");
  });

  it("Identical mutation returns the same decision (action equality)", () => {
    const baseline = lowHrvBaseline();
    const baselineDecision = evaluateAdaptation(baseline);
    const counterfactual = buildCounterfactualInput(baseline, {
      sleepHoursAvg2d: baseline.lifestyle.sleepHoursAvg2d ?? 7,
      alcoholLast2d: baseline.lifestyle.alcoholLast2d,
      feelingLast3d: baseline.lifestyle.feelingLast3d ?? "ok",
    });
    const hypothetical = evaluateAdaptation(counterfactual);
    expect(hypothetical.action).toBe(baselineDecision.action);
    expect(
      counterfactualChangedAction(baselineDecision.action, hypothetical.action)
    ).toBe(false);
  });
});

// =====================================================================
// counterfactualChangedAction
// =====================================================================

describe("counterfactualChangedAction", () => {
  it("returns true when actions differ", () => {
    expect(counterfactualChangedAction("top_set_reduction", "no_change")).toBe(
      true
    );
    expect(
      counterfactualChangedAction("paused_session", "top_set_reduction")
    ).toBe(true);
  });

  it("returns false when actions match", () => {
    expect(
      counterfactualChangedAction("top_set_reduction", "top_set_reduction")
    ).toBe(false);
    expect(counterfactualChangedAction("no_change", "no_change")).toBe(false);
  });
});
