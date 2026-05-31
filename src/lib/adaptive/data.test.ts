/**
 * Unit tests for the data-layer pure helpers.
 *
 * The async wrappers `loadEligibleMemberIds` and `buildEngineInput`
 * are integration-tested (separately, against the local Supabase).
 * These tests cover the deterministic aggregation logic in isolation
 * so it's clear which input drives which output.
 */

import { describe, expect, it } from "vitest";

import {
  aggregateLifestyle,
  computeRpeDrift,
  findMostRecentHeavySessionDay,
  pickLighterVariant,
  summarizeRecentSessions,
  type LifestyleRow,
  type SessionSetRow,
  type VariantMapRow,
} from "./data";

const NOW = new Date("2026-05-25T07:00:00.000Z");

// =====================================================================
// aggregateLifestyle
// =====================================================================

describe("aggregateLifestyle", () => {
  it("returns all-null defaults for an empty row set", () => {
    const result = aggregateLifestyle([], NOW);
    expect(result).toEqual({
      sleepHoursAvg2d: null,
      alcoholLast2d: false,
      feelingLast3d: null,
    });
  });

  it("averages sleep_hours across last 2 days", () => {
    const rows: LifestyleRow[] = [
      { logged_for_date: "2026-05-25", event_type: "sleep_hours", value: { hours: 7 } },
      { logged_for_date: "2026-05-24", event_type: "sleep_hours", value: { hours: 5 } },
      // Older day → ignored.
      { logged_for_date: "2026-05-22", event_type: "sleep_hours", value: { hours: 8 } },
    ];
    expect(aggregateLifestyle(rows, NOW).sleepHoursAvg2d).toBe(6);
  });

  it("ignores invalid sleep_hours values", () => {
    const rows: LifestyleRow[] = [
      { logged_for_date: "2026-05-25", event_type: "sleep_hours", value: { hours: -2 } },
      { logged_for_date: "2026-05-25", event_type: "sleep_hours", value: { hours: 30 } },
      { logged_for_date: "2026-05-25", event_type: "sleep_hours", value: { hours: 7.5 } },
    ];
    expect(aggregateLifestyle(rows, NOW).sleepHoursAvg2d).toBe(7.5);
  });

  it("flags alcoholLast2d when count ≥1 in the window", () => {
    const rows: LifestyleRow[] = [
      { logged_for_date: "2026-05-24", event_type: "alcohol_drinks", value: { count: 2 } },
    ];
    expect(aggregateLifestyle(rows, NOW).alcoholLast2d).toBe(true);
  });

  it("does not flag alcohol when count is 0", () => {
    const rows: LifestyleRow[] = [
      { logged_for_date: "2026-05-25", event_type: "alcohol_drinks", value: { count: 0 } },
    ];
    expect(aggregateLifestyle(rows, NOW).alcoholLast2d).toBe(false);
  });

  it("ignores alcohol logs outside the 2-day window", () => {
    const rows: LifestyleRow[] = [
      { logged_for_date: "2026-05-22", event_type: "alcohol_drinks", value: { count: 3 } },
    ];
    expect(aggregateLifestyle(rows, NOW).alcoholLast2d).toBe(false);
  });

  it("picks the most recent feeling in the last 3 days", () => {
    const rows: LifestyleRow[] = [
      { logged_for_date: "2026-05-24", event_type: "feeling", value: { state: "tired" } },
      { logged_for_date: "2026-05-25", event_type: "feeling", value: { state: "fresh" } },
    ];
    expect(aggregateLifestyle(rows, NOW).feelingLast3d).toBe("fresh");
  });

  it("ignores feeling logs older than 3 days", () => {
    const rows: LifestyleRow[] = [
      { logged_for_date: "2026-05-20", event_type: "feeling", value: { state: "stressed" } },
    ];
    expect(aggregateLifestyle(rows, NOW).feelingLast3d).toBeNull();
  });

  it("rejects unknown feeling states", () => {
    const rows: LifestyleRow[] = [
      { logged_for_date: "2026-05-25", event_type: "feeling", value: { state: "joyful" } },
    ];
    expect(aggregateLifestyle(rows, NOW).feelingLast3d).toBeNull();
  });

  it("ignores event_types other than sleep_hours, alcohol_drinks, feeling", () => {
    const rows: LifestyleRow[] = [
      { logged_for_date: "2026-05-25", event_type: "late_meal", value: { late: true } },
      { logged_for_date: "2026-05-25", event_type: "menstrual_start", value: { date: "2026-05-25" } },
    ];
    expect(aggregateLifestyle(rows, NOW)).toEqual({
      sleepHoursAvg2d: null,
      alcoholLast2d: false,
      feelingLast3d: null,
    });
  });
});

// =====================================================================
// summarizeRecentSessions
// =====================================================================

describe("summarizeRecentSessions", () => {
  function setRow(
    overrides: Partial<SessionSetRow> = {}
  ): SessionSetRow {
    return {
      session_id: "s-1",
      session_scheduled_for: "2026-05-22",
      session_status: "completed",
      exercise_position: 1,
      set_position: 1,
      target_rpe: 8,
      logged_rpe: 8,
      logged_reps: 5,
      ...overrides,
    };
  }

  it("returns empty array for no rows", () => {
    expect(summarizeRecentSessions([])).toEqual([]);
  });

  it("groups rows by session_id and sorts oldest first", () => {
    const rows: SessionSetRow[] = [
      setRow({ session_id: "s-b", session_scheduled_for: "2026-05-23" }),
      setRow({ session_id: "s-a", session_scheduled_for: "2026-05-20" }),
    ];
    const out = summarizeRecentSessions(rows);
    expect(out.map((s) => s.sessionId)).toEqual(["s-a", "s-b"]);
  });

  it("computes topSetRpeAvg from position=1 top sets only", () => {
    const rows: SessionSetRow[] = [
      setRow({ exercise_position: 1, set_position: 1, logged_rpe: 8 }),
      // Accessory exercise — ignored.
      setRow({ exercise_position: 2, set_position: 1, logged_rpe: 10 }),
      // Backoff set of main lift — also ignored.
      setRow({ exercise_position: 1, set_position: 2, logged_rpe: 6 }),
    ];
    const out = summarizeRecentSessions(rows);
    expect(out[0].topSetRpeAvg).toBe(8);
  });

  it("returns null topSetRpeAvg when no logged RPE", () => {
    const rows: SessionSetRow[] = [
      setRow({ logged_rpe: null }),
    ];
    expect(summarizeRecentSessions(rows)[0].topSetRpeAvg).toBeNull();
  });

  it("completionRatio is logged_reps non-null / total", () => {
    const rows: SessionSetRow[] = [
      setRow({ logged_reps: 5 }),
      setRow({ exercise_position: 1, set_position: 2, logged_reps: null }),
      setRow({ exercise_position: 2, set_position: 1, logged_reps: 10 }),
      setRow({ exercise_position: 2, set_position: 2, logged_reps: 10 }),
    ];
    expect(summarizeRecentSessions(rows)[0].completionRatio).toBe(0.75);
  });
});

// =====================================================================
// computeRpeDrift
// =====================================================================

describe("computeRpeDrift", () => {
  function setRow(
    overrides: Partial<SessionSetRow> = {}
  ): SessionSetRow {
    return {
      session_id: "s-1",
      session_scheduled_for: "2026-05-22",
      session_status: "completed",
      exercise_position: 1,
      set_position: 1,
      target_rpe: 8,
      logged_rpe: 8,
      logged_reps: 5,
      ...overrides,
    };
  }

  it("returns null when no top-set rows with both RPE values", () => {
    expect(computeRpeDrift([])).toBeNull();
    expect(computeRpeDrift([setRow({ logged_rpe: null })])).toBeNull();
    expect(computeRpeDrift([setRow({ target_rpe: null })])).toBeNull();
  });

  it("averages (logged - target) across top-set rows", () => {
    const rows: SessionSetRow[] = [
      setRow({ logged_rpe: 9, target_rpe: 8 }), // +1
      setRow({ logged_rpe: 8.5, target_rpe: 8 }), // +0.5
      setRow({ logged_rpe: 7, target_rpe: 8 }), // -1
    ];
    expect(computeRpeDrift(rows)).toBeCloseTo(0.1667, 3);
  });

  it("ignores accessory exercise rows", () => {
    const rows: SessionSetRow[] = [
      setRow({ exercise_position: 1, set_position: 1, logged_rpe: 9, target_rpe: 7 }),
      // Accessory row that would skew if counted.
      setRow({ exercise_position: 2, set_position: 1, logged_rpe: 10, target_rpe: 6 }),
    ];
    expect(computeRpeDrift(rows)).toBe(2);
  });
});

// =====================================================================
// pickLighterVariant
// =====================================================================

describe("pickLighterVariant", () => {
  it("returns null when no variant exists for the exercise", () => {
    expect(pickLighterVariant("ex-x", [])).toBeNull();
  });

  it("picks the first match for the exercise id", () => {
    const variants: VariantMapRow[] = [
      { exercise_id: "ex-a", lighter_variant_id: "ex-a-light", variant_reason: "joint_friendly" },
    ];
    expect(pickLighterVariant("ex-a", variants)).toEqual({
      exerciseId: "ex-a-light",
      variantReason: "joint_friendly",
    });
  });

  it("prefers joint_friendly over other reasons", () => {
    const variants: VariantMapRow[] = [
      { exercise_id: "ex-a", lighter_variant_id: "ex-a-uni", variant_reason: "unilateral" },
      { exercise_id: "ex-a", lighter_variant_id: "ex-a-jf", variant_reason: "joint_friendly" },
      { exercise_id: "ex-a", lighter_variant_id: "ex-a-cns", variant_reason: "low_cns" },
    ];
    expect(pickLighterVariant("ex-a", variants)?.exerciseId).toBe("ex-a-jf");
  });

  it("filters by exercise id even with many other rows", () => {
    const variants: VariantMapRow[] = [
      { exercise_id: "ex-b", lighter_variant_id: "wrong", variant_reason: "joint_friendly" },
      { exercise_id: "ex-a", lighter_variant_id: "right", variant_reason: "unilateral" },
    ];
    expect(pickLighterVariant("ex-a", variants)?.exerciseId).toBe("right");
  });
});

// =====================================================================
// findMostRecentHeavySessionDay
// =====================================================================

describe("findMostRecentHeavySessionDay", () => {
  function setRow(
    overrides: Partial<SessionSetRow> = {}
  ): SessionSetRow {
    return {
      session_id: "s-1",
      session_scheduled_for: "2026-05-22",
      session_status: "completed",
      exercise_position: 1,
      set_position: 1,
      target_rpe: 8,
      logged_rpe: 8,
      logged_reps: 5,
      ...overrides,
    };
  }

  it("returns null when no top set has target_rpe ≥8", () => {
    const rows: SessionSetRow[] = [setRow({ target_rpe: 7 })];
    expect(findMostRecentHeavySessionDay(rows)).toBeNull();
  });

  it("returns the latest scheduled date among heavy top sets", () => {
    const rows: SessionSetRow[] = [
      setRow({ session_id: "a", session_scheduled_for: "2026-05-20", target_rpe: 8 }),
      setRow({ session_id: "b", session_scheduled_for: "2026-05-23", target_rpe: 9 }),
      setRow({ session_id: "c", session_scheduled_for: "2026-05-21", target_rpe: 8.5 }),
    ];
    expect(findMostRecentHeavySessionDay(rows)).toBe("2026-05-23");
  });

  it("ignores accessory rows even if their target_rpe is high", () => {
    const rows: SessionSetRow[] = [
      setRow({ exercise_position: 2, set_position: 1, target_rpe: 10 }),
    ];
    expect(findMostRecentHeavySessionDay(rows)).toBeNull();
  });
});
