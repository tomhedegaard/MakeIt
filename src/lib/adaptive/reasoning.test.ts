/**
 * Unit tests for the reasoning-layer pure helpers.
 *
 * The async `refineWithClaude` wrapper is exercised separately
 * (integration / manual eval when ANTHROPIC_API_KEY is available).
 * These tests focus on:
 *   - buildUserPayload (correct snake_case shaping, no PII leaks,
 *     deterministic JSON for replay)
 *   - mapToRefinement (snake_case → camelCase, percent/accessory
 *     snapping, semantic guard for exercise_swap_variant)
 */

import { describe, expect, it } from "vitest";

import {
  buildUserPayload,
  mapToRefinement,
  type AdaptationDecisionOutput,
} from "./reasoning";
import type { CandidateDecision, EngineInput } from "./types";

const NOW = new Date("2026-05-25T07:00:00.000Z");

function decision(
  overrides: Partial<CandidateDecision> = {}
): CandidateDecision {
  return {
    action: "top_set_reduction",
    confidence: 0.8,
    reasons: ["hrv_low", "low_sleep"],
    params: { percent: 10 },
    humanReviewRecommended: false,
    explanationDa: "Din HRV er lav i dag, og kort søvn ovenpå.",
    ...overrides,
  };
}

function input(overrides: Partial<EngineInput> = {}): EngineInput {
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
    rpeDriftLast14d: 0.3,
    lifestyle: {
      sleepHoursAvg2d: 5.0,
      alcoholLast2d: false,
      feelingLast3d: "ok",
    },
    recentSessions: [
      {
        sessionId: "s-1",
        scheduledFor: "2026-05-22",
        status: "completed",
        topSetRpeAvg: 8.5,
        topSetTargetRpeAvg: 8,
        completionRatio: 1,
      },
    ],
    recentFormChecks: [
      {
        exerciseId: "ex-squat",
        score: 7,
        reviewedAt: "2026-05-24T18:00:00.000Z",
      },
    ],
    daysSinceHeavyLift: 2,
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
          lighterVariant: { exerciseId: "ex-goblet", variantReason: "joint_friendly" },
        },
      ],
    },
    now: NOW,
    ...overrides,
  };
}

// =====================================================================
// buildUserPayload
// =====================================================================

describe("buildUserPayload", () => {
  it("returns valid JSON with the expected top-level shape", () => {
    const payload = buildUserPayload(decision(), input());
    const parsed = JSON.parse(payload);
    expect(parsed).toHaveProperty("rule_decision");
    expect(parsed).toHaveProperty("member_snapshot");
    expect(parsed).toHaveProperty("next_session");
  });

  it("preserves the rule decision verbatim under snake_case key", () => {
    const payload = JSON.parse(buildUserPayload(decision(), input()));
    expect(payload.rule_decision).toEqual({
      action: "top_set_reduction",
      confidence: 0.8,
      reasons: ["hrv_low", "low_sleep"],
      params: { percent: 10 },
      human_review_recommended: false,
    });
  });

  it("summarises lifestyle with snake_case keys", () => {
    const payload = JSON.parse(buildUserPayload(decision(), input()));
    expect(payload.member_snapshot.lifestyle).toEqual({
      sleep_hours_avg_2d: 5.0,
      alcohol_last_2d: false,
      feeling_last_3d: "ok",
    });
  });

  it("includes main-lift form check when one exists for the next session's position=1", () => {
    const payload = JSON.parse(buildUserPayload(decision(), input()));
    expect(payload.member_snapshot.main_lift_recent_form_check).toEqual({
      exercise_name: "Back squat",
      score: 7,
      reviewed_at: "2026-05-24T18:00:00.000Z",
    });
  });

  it("returns null main-lift form check when no recent check exists", () => {
    const i = input();
    i.recentFormChecks = [];
    const payload = JSON.parse(buildUserPayload(decision(), i));
    expect(payload.member_snapshot.main_lift_recent_form_check).toBeNull();
  });

  it("counts missed sessions across recent history", () => {
    const i = input();
    i.recentSessions = [
      { ...i.recentSessions[0], sessionId: "a", status: "skipped" },
      { ...i.recentSessions[0], sessionId: "b", status: "completed" },
      { ...i.recentSessions[0], sessionId: "c", status: "skipped" },
    ];
    const payload = JSON.parse(buildUserPayload(decision(), i));
    expect(payload.member_snapshot.missed_sessions_in_last_3).toBe(2);
  });

  it("emits null reading when latestReading is absent", () => {
    const i = input();
    i.latestReading = null;
    const payload = JSON.parse(buildUserPayload(decision(), i));
    expect(payload.member_snapshot.reading).toBeNull();
  });

  it("is deterministic across repeated calls with the same input", () => {
    const a = buildUserPayload(decision(), input());
    const b = buildUserPayload(decision(), input());
    expect(a).toBe(b);
  });
});

// =====================================================================
// mapToRefinement
// =====================================================================

describe("mapToRefinement", () => {
  function raw(
    overrides: Partial<AdaptationDecisionOutput> = {}
  ): AdaptationDecisionOutput {
    return {
      final_action: "top_set_reduction",
      action_params: { percent: 10 },
      explanation_da: "Bedre forklaring fra Claude.",
      confidence: 0.85,
      human_review_recommended: false,
      reasons_used: ["hrv_low", "low_sleep"],
      ...overrides,
    };
  }

  it("converts snake_case fields to camelCase ReasoningRefinement", () => {
    const refined = mapToRefinement(raw());
    expect(refined).not.toBeNull();
    expect(refined?.explanationDa).toBe("Bedre forklaring fra Claude.");
    expect(refined?.confidence).toBe(0.85);
    expect(refined?.humanReviewRecommended).toBe(false);
  });

  it("snaps percent values to {5, 10, 15}", () => {
    expect(mapToRefinement(raw({ action_params: { percent: 4 } }))?.paramsOverride?.percent).toBe(5);
    expect(mapToRefinement(raw({ action_params: { percent: 8 } }))?.paramsOverride?.percent).toBe(10);
    expect(mapToRefinement(raw({ action_params: { percent: 12 } }))?.paramsOverride?.percent).toBe(10);
    expect(mapToRefinement(raw({ action_params: { percent: 14 } }))?.paramsOverride?.percent).toBe(15);
    expect(mapToRefinement(raw({ action_params: { percent: 18 } }))?.paramsOverride?.percent).toBe(15);
  });

  it("returns null percent when Claude over-shoots", () => {
    const refined = mapToRefinement(raw({ action_params: { percent: 50 } }));
    expect(refined?.paramsOverride?.percent).toBeUndefined();
  });

  it("snaps accessory_sets_dropped to integer in 1-3", () => {
    expect(
      mapToRefinement(
        raw({
          final_action: "volume_reduction",
          action_params: { accessory_sets_dropped: 1.4 },
        })
      )?.paramsOverride?.accessorySetsDropped
    ).toBe(1);
    expect(
      mapToRefinement(
        raw({
          final_action: "volume_reduction",
          action_params: { accessory_sets_dropped: 5 },
        })
      )?.paramsOverride?.accessorySetsDropped
    ).toBe(3);
  });

  it("rejects exercise_swap_variant without both ids", () => {
    expect(
      mapToRefinement(
        raw({
          final_action: "exercise_swap_variant",
          action_params: { from_exercise_id: "a" },
        })
      )
    ).toBeNull();
    expect(
      mapToRefinement(
        raw({
          final_action: "exercise_swap_variant",
          action_params: {},
        })
      )
    ).toBeNull();
  });

  it("accepts exercise_swap_variant with both ids + variant_reason", () => {
    const refined = mapToRefinement(
      raw({
        final_action: "exercise_swap_variant",
        action_params: {
          from_exercise_id: "ex-a",
          to_exercise_id: "ex-b",
          variant_reason: "joint_friendly",
        },
      })
    );
    expect(refined?.paramsOverride).toEqual({
      fromExerciseId: "ex-a",
      toExerciseId: "ex-b",
      variantReason: "joint_friendly",
    });
  });

  it("preserves rawOutput verbatim for audit", () => {
    const r = raw();
    const refined = mapToRefinement(r);
    expect(refined?.rawOutput).toEqual(r);
  });

  it("handles missing action_params gracefully (no_change, paused, deload)", () => {
    const refined = mapToRefinement(raw({ final_action: "paused_session", action_params: undefined }));
    expect(refined).not.toBeNull();
    expect(refined?.paramsOverride).toEqual({});
  });
});
