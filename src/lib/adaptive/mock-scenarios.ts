/**
 * Mock scenarios for marketing-grade surfaces (/hrv/learn/adaptive)
 * and visual smoke-testing.
 *
 * Spec: docs/superpowers/specs/2026-05-26-open-brain-ui-v0-design.md §3 (T5)
 *
 * Pure data: no DB, no React. Each scenario is a complete EngineInput
 * + the rule layer's CandidateDecision against it + an optional
 * Claude refinement. Tests verify the rule layer actually fires what
 * the scenario claims it should, so the explainer page can't lie
 * about how the engine reasons.
 *
 * Adding a new scenario:
 *   1. Define an EngineInput factory function.
 *   2. Compute `evaluateAdaptation(input)` in a test and assert the
 *      action + reasons match what the scenario's caller text claims.
 */

import { evaluateAdaptation } from "./engine";
import type {
  CandidateDecision,
  EngineInput,
} from "./types";

const MOCK_NOW = new Date("2026-05-25T07:00:00.000Z");

/**
 * The "you on a low-HRV morning" scenario: HRV low + 5h sleep +
 * feeling tired → engine emits top_set_reduction with three reasons.
 * Used as the default scenario on /hrv/learn/adaptive.
 *
 * Built to be richly populated so every signal row in
 * ReasoningDetailPanel has something to display.
 */
export function explainerScenarioInput(): EngineInput {
  return {
    memberId: "explainer-demo",
    adaptiveProgramEnabled: true,
    latestReading: {
      measuredAt: "2026-05-25T05:30:00.000Z",
      warmUpState: "active",
      readinessBucket: "low",
      isSick: false,
    },
    veryLowDaysLast5: 1,
    rpeDriftLast14d: 0.3,
    lifestyle: {
      sleepHoursAvg2d: 5.2,
      alcoholLast2d: false,
      feelingLast3d: "tired",
    },
    recentSessions: [
      {
        sessionId: "explainer-s1",
        scheduledFor: "2026-05-22",
        status: "completed",
        topSetRpeAvg: 8.0,
        topSetTargetRpeAvg: 8,
        completionRatio: 1,
      },
      {
        sessionId: "explainer-s2",
        scheduledFor: "2026-05-23",
        status: "completed",
        topSetRpeAvg: 8.5,
        topSetTargetRpeAvg: 8,
        completionRatio: 1,
      },
    ],
    recentFormChecks: [],
    daysSinceHeavyLift: 2,
    nextSession: {
      sessionId: "explainer-next",
      scheduledFor: "2026-05-26",
      title: "Back squat — top set @ RPE 8",
      week: 3,
      exercises: [
        {
          sessionExerciseId: "explainer-ex-1",
          exerciseId: "ex-squat",
          exerciseName: "Back squat",
          position: 1,
          hasLighterVariant: false,
          lighterVariant: null,
        },
        {
          sessionExerciseId: "explainer-ex-2",
          exerciseId: "ex-rdl",
          exerciseName: "Romanian deadlift",
          position: 2,
          hasLighterVariant: false,
          lighterVariant: null,
        },
      ],
    },
    now: MOCK_NOW,
  };
}

/**
 * The persisted Danish explanation that would appear on the
 * AdaptationCard for the explainer scenario. Hard-coded rather than
 * generated so the explainer page reads consistently across renders.
 */
export const EXPLAINER_EXPLANATION_DA =
  "Din HRV er lav i dag, og kort søvn ovenpå — vi har reduceret topsæt-vægten med 10%. Arbejdssæt og volumen er uændret.";

/**
 * Convenience: build the scenario's baseline decision by actually
 * running the rule layer. Keeps the explainer page and tests in sync
 * with the engine — if the rule logic changes, the scenario's
 * displayed decision changes too.
 */
export function explainerScenarioDecision(): CandidateDecision {
  return evaluateAdaptation(explainerScenarioInput());
}

/**
 * Mock Claude refinement for the scenario. Real reasoning layer
 * output would include reasons_used etc.; we narrow to the two
 * fields ReasoningDetailPanel actually displays so the panel can
 * render with a "Hvad Munks assistent justerede" subpanel.
 */
export const EXPLAINER_REASONING_OUTPUT = {
  finalAction: "top_set_reduction" as const,
  confidence: 0.85,
};
