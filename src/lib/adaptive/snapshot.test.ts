/**
 * Unit tests for hydrateEngineInputFromSnapshot.
 *
 * Strategy: most tests round-trip an EngineInput through
 * `buildModifierRow` (which contains `buildInputSnapshot` internally
 * — exported indirectly via the row's `input_snapshot` field) and
 * then back through the hydrator. This catches drift between
 * persist.ts's snapshot shape and snapshot.ts's expectations: if one
 * changes a key without the other, the round-trip test fails.
 *
 * A second batch of tests covers edge cases the round-trip can't
 * easily produce: corrupt snapshot, missing fields, off-bounds
 * numbers.
 */

import { describe, expect, it } from "vitest";

import { buildModifierRow } from "./persist";
import {
  hydrateEngineInputFromSnapshot,
  nextSessionExerciseCountFromSnapshot,
  recentFormCheckCountFromSnapshot,
} from "./snapshot";
import type { CandidateDecision, EngineInput } from "./types";

const NOW = new Date("2026-05-26T07:00:00.000Z");
const CREATED_AT = new Date("2026-05-25T03:30:00.000Z");

function baseInput(): EngineInput {
  return {
    memberId: "member-1",
    adaptiveProgramEnabled: true,
    latestReading: {
      measuredAt: "2026-05-25T05:00:00.000Z",
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
        sessionId: "s-a",
        scheduledFor: "2026-05-22",
        status: "completed",
        topSetRpeAvg: 8.5,
        topSetTargetRpeAvg: 8,
        completionRatio: 1,
      },
      {
        sessionId: "s-b",
        scheduledFor: "2026-05-23",
        status: "skipped",
        topSetRpeAvg: null,
        topSetTargetRpeAvg: null,
        completionRatio: 0,
      },
    ],
    recentFormChecks: [
      {
        exerciseId: "ex-squat",
        score: 7,
        reviewedAt: "2026-05-24T18:00:00.000Z",
      },
      {
        exerciseId: "ex-rdl",
        score: 8,
        reviewedAt: "2026-05-22T18:00:00.000Z",
      },
    ],
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
    now: NOW,
  };
}

function snapshotFor(input: EngineInput): unknown {
  // buildModifierRow writes input_snapshot via buildInputSnapshot.
  // Pulling it out from the row keeps the test contract decoupled
  // from whatever internal helpers persist.ts exports.
  const decision: CandidateDecision = {
    action: "top_set_reduction",
    confidence: 0.8,
    reasons: ["hrv_low"],
    params: { percent: 10 },
    humanReviewRecommended: false,
    explanationDa: "Test.",
  };
  const row = buildModifierRow(
    decision,
    { memberId: input.memberId, sessionId: "s-1", programId: null },
    input,
    null
  );
  return row.input_snapshot;
}

// =====================================================================
// Round-trip
// =====================================================================

describe("hydrateEngineInputFromSnapshot — round-trip with persist.ts", () => {
  it("preserves scalar fields verbatim", () => {
    const original = baseInput();
    const hydrated = hydrateEngineInputFromSnapshot(
      snapshotFor(original),
      CREATED_AT
    );
    expect(hydrated.memberId).toBe("member-1");
    expect(hydrated.veryLowDaysLast5).toBe(1);
    expect(hydrated.rpeDriftLast14d).toBe(0.3);
    expect(hydrated.daysSinceHeavyLift).toBe(3);
  });

  it("uses createdAt as the hydrated input's `now`, not the snapshot's", () => {
    const original = baseInput();
    const hydrated = hydrateEngineInputFromSnapshot(
      snapshotFor(original),
      CREATED_AT
    );
    expect(hydrated.now).toBe(CREATED_AT);
    expect(hydrated.now.toISOString()).not.toBe(NOW.toISOString());
  });

  it("preserves the latestReading shape", () => {
    const hydrated = hydrateEngineInputFromSnapshot(
      snapshotFor(baseInput()),
      CREATED_AT
    );
    expect(hydrated.latestReading).toEqual({
      measuredAt: "2026-05-25T05:00:00.000Z",
      warmUpState: "active",
      readinessBucket: "low",
      isSick: false,
    });
  });

  it("preserves lifestyle verbatim (the counterfactual surface)", () => {
    const hydrated = hydrateEngineInputFromSnapshot(
      snapshotFor(baseInput()),
      CREATED_AT
    );
    expect(hydrated.lifestyle).toEqual({
      sleepHoursAvg2d: 5.2,
      alcoholLast2d: false,
      feelingLast3d: "tired",
    });
  });

  it("preserves recent session RPE values; drops session ids (lossy)", () => {
    const hydrated = hydrateEngineInputFromSnapshot(
      snapshotFor(baseInput()),
      CREATED_AT
    );
    expect(hydrated.recentSessions.length).toBe(2);
    expect(hydrated.recentSessions[0].status).toBe("completed");
    expect(hydrated.recentSessions[0].topSetRpeAvg).toBe(8.5);
    expect(hydrated.recentSessions[0].topSetTargetRpeAvg).toBe(8);
    expect(hydrated.recentSessions[1].status).toBe("skipped");
    // Lossy fields → synthesised placeholders.
    expect(hydrated.recentSessions[0].sessionId).toMatch(/^snapshot-/);
    expect(hydrated.recentSessions[0].scheduledFor).toBeNull();
  });

  it("drops recentFormChecks array but keeps count via helper", () => {
    const snap = snapshotFor(baseInput());
    const hydrated = hydrateEngineInputFromSnapshot(snap, CREATED_AT);
    expect(hydrated.recentFormChecks).toEqual([]);
    expect(recentFormCheckCountFromSnapshot(snap)).toBe(2);
  });

  it("drops nextSession.exercises[] array but synthesises a positional placeholder list", () => {
    const snap = snapshotFor(baseInput());
    const hydrated = hydrateEngineInputFromSnapshot(snap, CREATED_AT);
    expect(hydrated.nextSession).not.toBeNull();
    expect(hydrated.nextSession?.sessionId).toBe("next-1");
    expect(hydrated.nextSession?.title).toBe("Squat day");
    // 2 exercises in the original → 2 placeholders.
    expect(hydrated.nextSession?.exercises.length).toBe(2);
    expect(hydrated.nextSession?.exercises[0].position).toBe(1);
    expect(hydrated.nextSession?.exercises[0].exerciseName).toBe("Hovedløft");
    expect(hydrated.nextSession?.exercises[0].lighterVariant).toBeNull();
    expect(nextSessionExerciseCountFromSnapshot(snap)).toBe(2);
  });

  it("preserves adaptiveProgramEnabled as true (the card exists, so member opted in)", () => {
    const hydrated = hydrateEngineInputFromSnapshot(
      snapshotFor(baseInput()),
      CREATED_AT
    );
    expect(hydrated.adaptiveProgramEnabled).toBe(true);
  });
});

// =====================================================================
// Null / missing inputs
// =====================================================================

describe("hydrateEngineInputFromSnapshot — null / missing fields", () => {
  it("returns a fully-defaulted EngineInput for null snapshot", () => {
    const hydrated = hydrateEngineInputFromSnapshot(null, CREATED_AT);
    expect(hydrated.memberId).toBe("");
    expect(hydrated.latestReading).toBeNull();
    expect(hydrated.veryLowDaysLast5).toBe(0);
    expect(hydrated.rpeDriftLast14d).toBeNull();
    expect(hydrated.lifestyle).toEqual({
      sleepHoursAvg2d: null,
      alcoholLast2d: false,
      feelingLast3d: null,
    });
    expect(hydrated.recentSessions).toEqual([]);
    expect(hydrated.recentFormChecks).toEqual([]);
    expect(hydrated.daysSinceHeavyLift).toBeNull();
    expect(hydrated.nextSession).toBeNull();
    expect(hydrated.now).toBe(CREATED_AT);
  });

  it("returns defaults for empty object", () => {
    const hydrated = hydrateEngineInputFromSnapshot({}, CREATED_AT);
    expect(hydrated.lifestyle.sleepHoursAvg2d).toBeNull();
    expect(hydrated.nextSession).toBeNull();
  });

  it("returns defaults for non-object input (string / number)", () => {
    expect(
      hydrateEngineInputFromSnapshot("definitely not a snapshot", CREATED_AT)
        .nextSession
    ).toBeNull();
    expect(
      hydrateEngineInputFromSnapshot(42, CREATED_AT).veryLowDaysLast5
    ).toBe(0);
  });

  it("treats reading with missing measured_at as null reading", () => {
    const snap = {
      reading: {
        warm_up_state: "active",
        readiness_bucket: "low",
        is_sick: false,
      },
    };
    expect(hydrateEngineInputFromSnapshot(snap, CREATED_AT).latestReading).toBeNull();
  });

  it("falls back unknown warm_up_state to 'discovery'", () => {
    const snap = {
      reading: {
        measured_at: "2026-05-25T05:00:00.000Z",
        warm_up_state: "garbage",
        readiness_bucket: "low",
        is_sick: false,
      },
    };
    expect(
      hydrateEngineInputFromSnapshot(snap, CREATED_AT).latestReading
        ?.warmUpState
    ).toBe("discovery");
  });

  it("falls back unknown readiness_bucket to null", () => {
    const snap = {
      reading: {
        measured_at: "2026-05-25T05:00:00.000Z",
        warm_up_state: "active",
        readiness_bucket: "xyz",
        is_sick: false,
      },
    };
    expect(
      hydrateEngineInputFromSnapshot(snap, CREATED_AT).latestReading
        ?.readinessBucket
    ).toBeNull();
  });

  it("rejects unknown feeling state", () => {
    const snap = {
      lifestyle: {
        sleep_hours_avg_2d: 7,
        alcohol_last_2d: false,
        feeling_last_3d: "fantastic",
      },
    };
    expect(
      hydrateEngineInputFromSnapshot(snap, CREATED_AT).lifestyle.feelingLast3d
    ).toBeNull();
  });
});

// =====================================================================
// Bounds + sanitisation
// =====================================================================

describe("hydrateEngineInputFromSnapshot — bounds + sanitisation", () => {
  it("clamps very_low_days_last_5 to [0, 5]", () => {
    expect(
      hydrateEngineInputFromSnapshot(
        { very_low_days_last_5: -1 },
        CREATED_AT
      ).veryLowDaysLast5
    ).toBe(0);
    expect(
      hydrateEngineInputFromSnapshot(
        { very_low_days_last_5: 99 },
        CREATED_AT
      ).veryLowDaysLast5
    ).toBe(5);
    expect(
      hydrateEngineInputFromSnapshot(
        { very_low_days_last_5: 3.7 },
        CREATED_AT
      ).veryLowDaysLast5
    ).toBe(3);
  });

  it("nextSession with negative exercise_count → empty list", () => {
    const snap = {
      next_session: {
        session_id: "n",
        scheduled_for: "2026-05-26",
        title: "",
        week: null,
        exercise_count: -2,
      },
    };
    expect(
      hydrateEngineInputFromSnapshot(snap, CREATED_AT).nextSession?.exercises
    ).toEqual([]);
  });
});

// =====================================================================
// Count helpers (independent of full hydration)
// =====================================================================

describe("count helpers", () => {
  it("recentFormCheckCountFromSnapshot defaults to 0 for null", () => {
    expect(recentFormCheckCountFromSnapshot(null)).toBe(0);
    expect(recentFormCheckCountFromSnapshot({})).toBe(0);
    expect(
      recentFormCheckCountFromSnapshot({ recent_form_check_count: -3 })
    ).toBe(0);
    expect(
      recentFormCheckCountFromSnapshot({ recent_form_check_count: 7 })
    ).toBe(7);
  });

  it("nextSessionExerciseCountFromSnapshot reads through next_session", () => {
    expect(nextSessionExerciseCountFromSnapshot(null)).toBe(0);
    expect(
      nextSessionExerciseCountFromSnapshot({ next_session: null })
    ).toBe(0);
    expect(
      nextSessionExerciseCountFromSnapshot({
        next_session: { exercise_count: 4 },
      })
    ).toBe(4);
  });
});
