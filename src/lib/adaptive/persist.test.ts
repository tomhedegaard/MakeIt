/**
 * Unit tests for the persistence-layer pure helpers.
 *
 * The async `persistAdaptation` wrapper is exercised by integration
 * tests (separate file, run against the local Supabase). These tests
 * focus on:
 *   - shouldEscalate (precedence: always-escalating actions vs flag)
 *   - buildModifierRow (correct mapping from CandidateDecision → row,
 *     with and without reasoning refinement)
 *   - buildAlertRow (correct conditions_met jsonb structure)
 */

import { describe, expect, it } from "vitest";

import {
  buildAlertRow,
  buildModifierRow,
  shouldEscalate,
  type PersistContext,
  type ReasoningRefinement,
} from "./persist";
import type { CandidateDecision, EngineInput } from "./types";

const NOW = new Date("2026-05-25T07:00:00.000Z");

const CONTEXT: PersistContext = {
  memberId: "member-1",
  sessionId: "session-99",
  programId: "program-7",
};

function ruleDecision(
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

function engineInput(overrides: Partial<EngineInput> = {}): EngineInput {
  return {
    memberId: "member-1",
    adaptiveProgramEnabled: true,
    latestReading: {
      measuredAt: "2026-05-25T05:00:00.000Z",
      warmUpState: "active",
      readinessBucket: "low",
      isSick: false,
    },
    veryLowDaysLast5: 0,
    rpeDriftLast14d: 0.4,
    lifestyle: {
      sleepHoursAvg2d: 5.2,
      alcoholLast2d: false,
      feelingLast3d: "ok",
    },
    recentSessions: [
      {
        sessionId: "s-a",
        scheduledFor: "2026-05-22",
        status: "completed",
        topSetRpeAvg: 8,
        topSetTargetRpeAvg: 8,
        completionRatio: 1,
      },
    ],
    recentFormChecks: [],
    daysSinceHeavyLift: 2,
    nextSession: {
      sessionId: "session-99",
      scheduledFor: "2026-05-26",
      title: "Squat day",
      week: 3,
      exercises: [],
    },
    now: NOW,
    ...overrides,
  };
}

// =====================================================================
// shouldEscalate
// =====================================================================

describe("shouldEscalate", () => {
  it("escalates paused_session regardless of flag", () => {
    expect(shouldEscalate("paused_session", false)).toBe(true);
    expect(shouldEscalate("paused_session", true)).toBe(true);
  });

  it("escalates deload_week_insertion regardless of flag", () => {
    expect(shouldEscalate("deload_week_insertion", false)).toBe(true);
  });

  it("escalates escalate_to_coach regardless of flag", () => {
    expect(shouldEscalate("escalate_to_coach", false)).toBe(true);
  });

  it("respects flag for non-always-escalating actions", () => {
    expect(shouldEscalate("top_set_reduction", false)).toBe(false);
    expect(shouldEscalate("top_set_reduction", true)).toBe(true);
    expect(shouldEscalate("volume_reduction", false)).toBe(false);
    expect(shouldEscalate("exercise_swap_variant", true)).toBe(true);
    expect(shouldEscalate("session_shorten", false)).toBe(false);
  });

  it("does not escalate no_change", () => {
    expect(shouldEscalate("no_change", false)).toBe(false);
    expect(shouldEscalate("no_change", true)).toBe(false);
  });
});

// =====================================================================
// buildModifierRow
// =====================================================================

describe("buildModifierRow — rule layer only", () => {
  it("maps a top_set_reduction decision to a self-signed-off row", () => {
    const row = buildModifierRow(ruleDecision(), CONTEXT, engineInput(), null);
    expect(row.member_id).toBe("member-1");
    expect(row.session_id).toBe("session-99");
    expect(row.program_id).toBe("program-7");
    expect(row.modifier_type).toBe("top_set_reduction");
    expect(row.reason).toBe("adaptive_v0");
    expect(row.applied_value).toEqual({ percent: 10 });
    expect(row.confidence).toBe(0.8);
    expect(row.explanation_da).toMatch(/HRV/);
    expect(row.reviewed_by).toBe("auto");
    expect(row.reviewed_at).toBeTypeOf("string");
  });

  it("leaves reviewed_by null for always-escalating actions", () => {
    const decision = ruleDecision({
      action: "paused_session",
      params: {},
      humanReviewRecommended: true,
      reasons: ["hrv_very_low"],
    });
    const row = buildModifierRow(decision, CONTEXT, engineInput(), null);
    expect(row.modifier_type).toBe("paused_session");
    expect(row.reviewed_by).toBeNull();
    expect(row.reviewed_at).toBeNull();
  });

  it("preserves the full rule_decision blob for audit", () => {
    const decision = ruleDecision();
    const row = buildModifierRow(decision, CONTEXT, engineInput(), null);
    const ruleDecisionBlob = row.rule_decision as Record<string, unknown>;
    expect(ruleDecisionBlob.action).toBe("top_set_reduction");
    expect(ruleDecisionBlob.confidence).toBe(0.8);
    expect(ruleDecisionBlob.reasons).toEqual(["hrv_low", "low_sleep"]);
  });

  it("trims input_snapshot to essential fields only", () => {
    const row = buildModifierRow(ruleDecision(), CONTEXT, engineInput(), null);
    const snapshot = row.input_snapshot as Record<string, unknown>;
    expect(snapshot).toHaveProperty("reading");
    expect(snapshot).toHaveProperty("lifestyle");
    expect(snapshot).toHaveProperty("very_low_days_last_5");
    // Form-check array trimmed to count only — avoids jsonb bloat.
    expect(snapshot).toHaveProperty("recent_form_check_count");
    expect(snapshot).not.toHaveProperty("recent_form_checks");
  });

  it("sets reasoning_output to null when no refinement provided", () => {
    const row = buildModifierRow(ruleDecision(), CONTEXT, engineInput(), null);
    expect(row.reasoning_output).toBeNull();
  });
});

describe("buildModifierRow — with reasoning refinement", () => {
  function refinement(
    overrides: Partial<ReasoningRefinement> = {}
  ): ReasoningRefinement {
    return {
      rawOutput: {
        final_action: "top_set_reduction",
        action_params: { percent: 15 },
        confidence: 0.9,
        human_review_recommended: false,
        explanation_da: "Bedre formuleret forklaring fra Claude.",
        reasons_used: ["hrv_low", "low_sleep"],
      } as unknown as import("@/lib/supabase/database.types").Json,
      explanationDa: "Bedre formuleret forklaring fra Claude.",
      confidence: 0.9,
      humanReviewRecommended: false,
      paramsOverride: { percent: 15 },
      ...overrides,
    };
  }

  it("refinement overrides explanation_da, confidence, and params", () => {
    const row = buildModifierRow(
      ruleDecision(),
      CONTEXT,
      engineInput(),
      refinement()
    );
    expect(row.confidence).toBe(0.9);
    expect(row.explanation_da).toBe("Bedre formuleret forklaring fra Claude.");
    expect(row.applied_value).toEqual({ percent: 15 });
  });

  it("rule_decision retains the original rule output (not refined)", () => {
    const row = buildModifierRow(
      ruleDecision(),
      CONTEXT,
      engineInput(),
      refinement()
    );
    const ruleDecisionBlob = row.rule_decision as Record<string, unknown>;
    expect(ruleDecisionBlob.confidence).toBe(0.8); // rule layer's, not 0.9
    expect((ruleDecisionBlob.params as Record<string, unknown>).percent).toBe(10);
  });

  it("reasoning_output stores the full Claude blob", () => {
    const ref = refinement();
    const row = buildModifierRow(ruleDecision(), CONTEXT, engineInput(), ref);
    expect(row.reasoning_output).toEqual(ref.rawOutput);
  });

  it("refinement humanReviewRecommended=true flips reviewed_by to null", () => {
    const row = buildModifierRow(
      ruleDecision(), // rule says: not escalating
      CONTEXT,
      engineInput(),
      refinement({ humanReviewRecommended: true })
    );
    expect(row.reviewed_by).toBeNull();
    expect(row.reviewed_at).toBeNull();
  });
});

// =====================================================================
// buildAlertRow
// =====================================================================

describe("buildAlertRow", () => {
  it("links back to the modifier and includes member-facing copy", () => {
    const decision = ruleDecision({
      action: "deload_week_insertion",
      reasons: ["sustained_low_readiness"],
      humanReviewRecommended: true,
      explanationDa: "Din krop har trukket læsset over en længere periode.",
    });
    const row = buildAlertRow(decision, CONTEXT, null, "mod-abc", NOW);
    expect(row.member_id).toBe("member-1");
    expect(row.session_modifier_id).toBe("mod-abc");
    expect(row.triggered_at).toBe(NOW.toISOString());
    const cm = row.conditions_met as Record<string, unknown>;
    expect(cm.source).toBe("adaptive_v0");
    expect(cm.action).toBe("deload_week_insertion");
    expect(cm.session_id).toBe("session-99");
    expect(cm.reasons).toEqual(["sustained_low_readiness"]);
    expect(cm.explanation_da).toMatch(/læsset/);
  });

  it("uses refinement's explanation + confidence when provided", () => {
    const decision = ruleDecision({
      action: "paused_session",
      humanReviewRecommended: true,
    });
    const ref: ReasoningRefinement = {
      rawOutput: {} as import("@/lib/supabase/database.types").Json,
      explanationDa: "Refined.",
      confidence: 0.95,
      humanReviewRecommended: true,
    };
    const row = buildAlertRow(decision, CONTEXT, ref, "mod-xyz", NOW);
    const cm = row.conditions_met as Record<string, unknown>;
    expect(cm.confidence).toBe(0.95);
    expect(cm.explanation_da).toBe("Refined.");
  });
});
