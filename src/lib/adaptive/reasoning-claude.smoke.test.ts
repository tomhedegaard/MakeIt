/**
 * Integration smoke test for refineWithClaude. Mocks `server-only` so
 * the wrapper can run in Node, then calls the real Anthropic SDK with
 * the project's API key.
 *
 * Investigation: docs/superpowers/specs/2026-05-26-adaptive-reasoning-fallback-investigation.md
 *
 * Skipped unless RUN_REASONING_SMOKE=1 — we don't want to burn API
 * credits on every npm test. Run on demand:
 *
 *   RUN_REASONING_SMOKE=1 ANTHROPIC_API_KEY=... \
 *     npx vitest run src/lib/adaptive/reasoning-claude.smoke.test.ts
 */

import { describe, expect, it, vi } from "vitest";

// Mock server-only so the wrapper can be imported in Node.
vi.mock("server-only", () => ({}));

import { refineWithClaude } from "./reasoning-claude";
import type { CandidateDecision, EngineInput } from "./types";

const RUN = process.env.RUN_REASONING_SMOKE === "1";

const baseline: EngineInput = {
  memberId: "smoke-member",
  adaptiveProgramEnabled: true,
  latestReading: {
    measuredAt: "2026-05-26T05:30:00.000Z",
    warmUpState: "active",
    readinessBucket: "low",
    isSick: false,
  },
  veryLowDaysLast5: 0,
  rpeDriftLast14d: 0.3,
  lifestyle: {
    sleepHoursAvg2d: 5.2,
    alcoholLast2d: false,
    feelingLast3d: "tired",
  },
  recentSessions: [
    {
      sessionId: "s-1",
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
    sessionId: "next-1",
    scheduledFor: "2026-05-26",
    title: "Deadlift — top set",
    week: 3,
    exercises: [
      {
        sessionExerciseId: "se-1",
        exerciseId: "ex-deadlift",
        exerciseName: "Conventional deadlift",
        position: 1,
        hasLighterVariant: false,
        lighterVariant: null,
      },
    ],
  },
  now: new Date("2026-05-26T07:00:00.000Z"),
};

const decision: CandidateDecision = {
  action: "top_set_reduction",
  confidence: 0.8,
  reasons: ["hrv_low", "low_sleep", "low_feeling"],
  params: { percent: 10 },
  humanReviewRecommended: false,
  explanationDa: "Rule-layer fallback explanation.",
};

describe.skipIf(!RUN)("refineWithClaude — real SDK smoke", () => {
  it("returns a non-null refinement for the canonical low-HRV scenario", async () => {
    const result = await refineWithClaude(decision, baseline);
    console.log("[smoke] refinement:", JSON.stringify(result, null, 2));
    expect(result).not.toBeNull();
    expect(result?.explanationDa.length).toBeGreaterThan(10);
    expect(result?.confidence).toBeGreaterThan(0);
    expect(result?.paramsOverride?.percent).toBeOneOf([5, 10, 15]);
  });
});

describe("smoke harness sanity", () => {
  it("vi.mock('server-only') unblocks the wrapper import", () => {
    expect(typeof refineWithClaude).toBe("function");
  });
});
