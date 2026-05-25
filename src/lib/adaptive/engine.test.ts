/**
 * Unit tests for the Adaptive Program Engine rule layer.
 *
 * Strategy: one `baseInput()` factory that returns a known-good
 * "no actionable signals" snapshot. Each test overrides one or two
 * fields and asserts the action + reasons + humanReviewRecommended.
 * This isolates exactly what flipped the decision and keeps tests
 * readable when rules evolve.
 */

import { describe, expect, it } from "vitest";

import { evaluateAdaptation } from "./engine";
import type { EngineInput } from "./types";

const FIXED_NOW = new Date("2026-05-25T07:00:00.000Z");

function baseInput(): EngineInput {
  return {
    memberId: "member-1",
    adaptiveProgramEnabled: true,
    latestReading: {
      measuredAt: new Date(FIXED_NOW.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      warmUpState: "active",
      readinessBucket: "normal",
      isSick: false,
    },
    veryLowDaysLast5: 0,
    rpeDriftLast14d: 0,
    lifestyle: {
      sleepHoursAvg2d: 7.5,
      alcoholLast2d: false,
      feelingLast3d: "ok",
    },
    recentSessions: [
      session("s-1", "completed", { topSetRpeAvg: 7.5, topSetTargetRpeAvg: 8 }),
      session("s-2", "completed", { topSetRpeAvg: 8, topSetTargetRpeAvg: 8 }),
      session("s-3", "completed", { topSetRpeAvg: 8, topSetTargetRpeAvg: 8 }),
    ],
    recentFormChecks: [],
    daysSinceHeavyLift: 3,
    nextSession: {
      sessionId: "next-1",
      scheduledFor: "2026-05-26",
      title: "Squat day",
      week: 3,
      exercises: [
        {
          sessionExerciseId: "se-1",
          exerciseId: "ex-squat",
          exerciseName: "Back squat",
          position: 1,
          hasLighterVariant: true,
          lighterVariant: {
            exerciseId: "ex-goblet",
            variantReason: "joint_friendly",
          },
        },
        {
          sessionExerciseId: "se-2",
          exerciseId: "ex-rdl",
          exerciseName: "Romanian deadlift",
          position: 2,
          hasLighterVariant: false,
          lighterVariant: null,
        },
      ],
    },
    now: FIXED_NOW,
  };
}

function session(
  id: string,
  status: "scheduled" | "active" | "completed" | "skipped",
  overrides: Partial<{
    topSetRpeAvg: number | null;
    topSetTargetRpeAvg: number | null;
    completionRatio: number | null;
  }> = {}
) {
  return {
    sessionId: id,
    scheduledFor: "2026-05-20",
    status,
    topSetRpeAvg: overrides.topSetRpeAvg ?? null,
    topSetTargetRpeAvg: overrides.topSetTargetRpeAvg ?? null,
    completionRatio: overrides.completionRatio ?? 1,
  };
}

// =====================================================================
// Hard exits
// =====================================================================

describe("evaluateAdaptation — hard exits", () => {
  it("returns no_change when adaptiveProgramEnabled is false", () => {
    const input = { ...baseInput(), adaptiveProgramEnabled: false };
    const result = evaluateAdaptation(input);
    expect(result.action).toBe("no_change");
    expect(result.reasons).toEqual(["opt_out"]);
    expect(result.humanReviewRecommended).toBe(false);
  });

  it("returns no_change when no next session is scheduled", () => {
    const input = { ...baseInput(), nextSession: null };
    const result = evaluateAdaptation(input);
    expect(result.action).toBe("no_change");
    expect(result.reasons).toEqual(["no_next_session"]);
  });

  it("returns no_change when latestReading is null", () => {
    const input = { ...baseInput(), latestReading: null };
    const result = evaluateAdaptation(input);
    expect(result.action).toBe("no_change");
    expect(result.reasons).toEqual(["no_reading"]);
  });

  it("returns no_change when reading is older than 36h", () => {
    const stale = new Date(FIXED_NOW.getTime() - 40 * 60 * 60 * 1000);
    const input = baseInput();
    input.latestReading = { ...input.latestReading!, measuredAt: stale.toISOString() };
    const result = evaluateAdaptation(input);
    expect(result.action).toBe("no_change");
    expect(result.reasons).toEqual(["stale_reading"]);
  });

  it("returns no_change when reading timestamp is in the future", () => {
    const future = new Date(FIXED_NOW.getTime() + 60 * 60 * 1000);
    const input = baseInput();
    input.latestReading = { ...input.latestReading!, measuredAt: future.toISOString() };
    const result = evaluateAdaptation(input);
    expect(result.action).toBe("no_change");
    expect(result.reasons).toEqual(["stale_reading"]);
  });

  it("returns no_change when warmUpState is provisional", () => {
    const input = baseInput();
    input.latestReading = { ...input.latestReading!, warmUpState: "provisional" };
    const result = evaluateAdaptation(input);
    expect(result.action).toBe("no_change");
    expect(result.reasons).toEqual(["warmup_incomplete"]);
  });
});

// =====================================================================
// Critical signals (always escalate to coach)
// =====================================================================

describe("evaluateAdaptation — critical signals", () => {
  it("pauses session when isSick is true", () => {
    const input = baseInput();
    input.latestReading = { ...input.latestReading!, isSick: true };
    const result = evaluateAdaptation(input);
    expect(result.action).toBe("paused_session");
    expect(result.reasons).toEqual(["sick_marker"]);
    expect(result.humanReviewRecommended).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it("escalates to deload when 3+ very_low days in last 5", () => {
    const input = { ...baseInput(), veryLowDaysLast5: 3 };
    const result = evaluateAdaptation(input);
    expect(result.action).toBe("deload_week_insertion");
    expect(result.reasons).toContain("sustained_low_readiness");
    expect(result.humanReviewRecommended).toBe(true);
  });

  it("escalates to deload when rpe drift ≥1.5 over 14d", () => {
    const input = { ...baseInput(), rpeDriftLast14d: 1.6 };
    const result = evaluateAdaptation(input);
    expect(result.action).toBe("deload_week_insertion");
    expect(result.reasons).toEqual(
      expect.arrayContaining(["sustained_low_readiness", "rpe_drift_rising"])
    );
  });

  it("pauses session on acute very_low HRV", () => {
    const input = baseInput();
    input.latestReading = { ...input.latestReading!, readinessBucket: "very_low" };
    const result = evaluateAdaptation(input);
    expect(result.action).toBe("paused_session");
    expect(result.reasons).toEqual(["hrv_very_low"]);
    expect(result.humanReviewRecommended).toBe(true);
  });

  it("deload takes precedence over acute very_low", () => {
    const input = { ...baseInput(), veryLowDaysLast5: 4 };
    input.latestReading = { ...input.latestReading!, readinessBucket: "very_low" };
    const result = evaluateAdaptation(input);
    expect(result.action).toBe("deload_week_insertion");
  });

  it("sickness takes precedence over deload pattern", () => {
    const input = { ...baseInput(), veryLowDaysLast5: 5 };
    input.latestReading = { ...input.latestReading!, isSick: true };
    const result = evaluateAdaptation(input);
    expect(result.action).toBe("paused_session");
    expect(result.reasons).toEqual(["sick_marker"]);
  });
});

// =====================================================================
// HRV low — combinations
// =====================================================================

describe("evaluateAdaptation — HRV low combinations", () => {
  it("swaps main lift to lighter variant when HRV low + form-check concern", () => {
    const input = baseInput();
    input.latestReading = { ...input.latestReading!, readinessBucket: "low" };
    input.recentFormChecks = [
      {
        exerciseId: "ex-squat",
        score: 5.5,
        reviewedAt: new Date(FIXED_NOW.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
    const result = evaluateAdaptation(input);
    expect(result.action).toBe("exercise_swap_variant");
    expect(result.reasons).toEqual(["hrv_low", "form_check_concern"]);
    expect(result.params).toMatchObject({
      fromExerciseId: "ex-squat",
      toExerciseId: "ex-goblet",
      variantReason: "joint_friendly",
    });
    expect(result.humanReviewRecommended).toBe(false);
  });

  it("falls back to top_set_reduction when no lighter variant exists for the main lift", () => {
    const input = baseInput();
    input.latestReading = { ...input.latestReading!, readinessBucket: "low" };
    // Remove the variant.
    input.nextSession!.exercises[0].hasLighterVariant = false;
    input.nextSession!.exercises[0].lighterVariant = null;
    input.recentFormChecks = [
      {
        exerciseId: "ex-squat",
        score: 5.5,
        reviewedAt: new Date(FIXED_NOW.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
    // Add low_sleep so we have a HRV-low+lifestyle path to fall through to.
    input.lifestyle.sleepHoursAvg2d = 5.0;
    const result = evaluateAdaptation(input);
    expect(result.action).toBe("top_set_reduction");
    expect(result.params.percent).toBe(10);
  });

  it("reduces top set 10% when HRV low + low sleep", () => {
    const input = baseInput();
    input.latestReading = { ...input.latestReading!, readinessBucket: "low" };
    input.lifestyle.sleepHoursAvg2d = 5.0;
    const result = evaluateAdaptation(input);
    expect(result.action).toBe("top_set_reduction");
    expect(result.params.percent).toBe(10);
    expect(result.reasons).toEqual(["hrv_low", "low_sleep"]);
    expect(result.humanReviewRecommended).toBe(false);
  });

  it("reduces top set 10% when HRV low + recent alcohol", () => {
    const input = baseInput();
    input.latestReading = { ...input.latestReading!, readinessBucket: "low" };
    input.lifestyle.alcoholLast2d = true;
    const result = evaluateAdaptation(input);
    expect(result.action).toBe("top_set_reduction");
    expect(result.reasons).toEqual(["hrv_low", "recent_alcohol"]);
  });

  it("includes all matching lifestyle reasons in top_set_reduction", () => {
    const input = baseInput();
    input.latestReading = { ...input.latestReading!, readinessBucket: "low" };
    input.lifestyle.sleepHoursAvg2d = 5.0;
    input.lifestyle.alcoholLast2d = true;
    input.lifestyle.feelingLast3d = "tired";
    const result = evaluateAdaptation(input);
    expect(result.action).toBe("top_set_reduction");
    expect(result.reasons).toEqual([
      "hrv_low",
      "low_sleep",
      "recent_alcohol",
      "low_feeling",
    ]);
  });

  it("drops 2 accessory sets when HRV low with no lifestyle co-factor", () => {
    const input = baseInput();
    input.latestReading = { ...input.latestReading!, readinessBucket: "low" };
    const result = evaluateAdaptation(input);
    expect(result.action).toBe("volume_reduction");
    expect(result.params.accessorySetsDropped).toBe(2);
    expect(result.reasons).toEqual(["hrv_low"]);
  });
});

// =====================================================================
// Non-HRV signals
// =====================================================================

describe("evaluateAdaptation — non-HRV signals", () => {
  it("shortens session on RPE overshoot + missed sessions", () => {
    const input = baseInput();
    input.recentSessions = [
      session("s-1", "skipped"),
      session("s-2", "skipped"),
      session("s-3", "completed", { topSetRpeAvg: 9.5, topSetTargetRpeAvg: 8 }),
    ];
    const result = evaluateAdaptation(input);
    expect(result.action).toBe("session_shorten");
    expect(result.reasons).toEqual(["rpe_overshoot", "missed_sessions"]);
  });

  it("escalates on unusual combination (≥3 signals, no rule match)", () => {
    const input = baseInput();
    // Normal HRV, but three non-HRV signals that don't combine into a
    // direct action: low_sleep + recent_alcohol + low_feeling.
    input.lifestyle.sleepHoursAvg2d = 5.0;
    input.lifestyle.alcoholLast2d = true;
    input.lifestyle.feelingLast3d = "tired";
    const result = evaluateAdaptation(input);
    expect(result.action).toBe("escalate_to_coach");
    expect(result.reasons[0]).toBe("unusual_signal_combination");
    expect(result.humanReviewRecommended).toBe(true);
  });
});

// =====================================================================
// Default path
// =====================================================================

describe("evaluateAdaptation — default", () => {
  it("returns no_change when all signals are benign", () => {
    const result = evaluateAdaptation(baseInput());
    expect(result.action).toBe("no_change");
    expect(result.reasons).toEqual(["no_actionable_signals"]);
    expect(result.humanReviewRecommended).toBe(false);
    expect(result.explanationDa).toMatch(/planlagt/i);
  });

  it("ignores form-check concern on non-main-lift exercises", () => {
    const input = baseInput();
    input.latestReading = { ...input.latestReading!, readinessBucket: "low" };
    // Form-check on the position=2 exercise, not the main lift.
    input.recentFormChecks = [
      {
        exerciseId: "ex-rdl",
        score: 4,
        reviewedAt: new Date(FIXED_NOW.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
    const result = evaluateAdaptation(input);
    // No form_check_concern signal → falls through to volume_reduction.
    expect(result.action).toBe("volume_reduction");
    expect(result.reasons).toEqual(["hrv_low"]);
  });

  it("explanation is non-empty Danish text for every decision path", () => {
    const cases: Array<() => EngineInput> = [
      () => ({ ...baseInput(), adaptiveProgramEnabled: false }),
      () => ({ ...baseInput(), nextSession: null }),
      () => ({ ...baseInput(), latestReading: null }),
      () => {
        const i = baseInput();
        i.latestReading = { ...i.latestReading!, isSick: true };
        return i;
      },
      () => ({ ...baseInput(), veryLowDaysLast5: 4 }),
      () => {
        const i = baseInput();
        i.latestReading = { ...i.latestReading!, readinessBucket: "very_low" };
        return i;
      },
      () => {
        const i = baseInput();
        i.latestReading = { ...i.latestReading!, readinessBucket: "low" };
        return i;
      },
    ];
    for (const factory of cases) {
      const result = evaluateAdaptation(factory());
      expect(result.explanationDa.length).toBeGreaterThan(10);
      expect(result.explanationDa.length).toBeLessThan(280);
    }
  });
});
