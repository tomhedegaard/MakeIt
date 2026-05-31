import { describe, it, expect } from "vitest";
import {
  COACHING_REPS_TABLE,
  isoWeekStartUtc,
  isoWeekTag,
} from "./reps-awards";

describe("COACHING_REPS_TABLE", () => {
  it("matches the deltas the spec promises", () => {
    expect(COACHING_REPS_TABLE.lesson_completed.delta).toBe(20);
    expect(COACHING_REPS_TABLE.coach_review_sandbox.delta).toBe(10);
    expect(COACHING_REPS_TABLE.co_coach_promotion.delta).toBe(200);
    expect(COACHING_REPS_TABLE.buddy_interaction_streak.delta).toBe(5);
  });

  it("provides a non-empty Danish reason string for every type", () => {
    for (const k of Object.keys(COACHING_REPS_TABLE)) {
      const entry =
        COACHING_REPS_TABLE[k as keyof typeof COACHING_REPS_TABLE];
      expect(entry.reason.length).toBeGreaterThan(0);
    }
  });
});

describe("isoWeekTag", () => {
  it("formats a Monday in week 22 of 2026 as '2026-W22'", () => {
    // 2026-05-25 is a Monday. ISO week 22.
    const d = new Date(Date.UTC(2026, 4, 25));
    expect(isoWeekTag(d)).toBe("2026-W22");
  });

  it("places a Sunday in the same ISO week as the Monday before it", () => {
    // 2026-05-31 is a Sunday — still ISO week 22 because Monday
    // (2026-05-25) belongs to W22.
    expect(isoWeekTag(new Date(Date.UTC(2026, 4, 31)))).toBe("2026-W22");
  });

  it("rolls a Monday into the next week tag", () => {
    // 2026-06-01 is the Monday starting W23.
    expect(isoWeekTag(new Date(Date.UTC(2026, 5, 1)))).toBe("2026-W23");
  });

  it("handles the January edge case where Jan 1 falls in the prior year's W53", () => {
    // 2027-01-01 is a Friday. ISO week 53 of 2026 (because Thursday
    // 2026-12-31 is the anchor day).
    expect(isoWeekTag(new Date(Date.UTC(2027, 0, 1)))).toBe("2026-W53");
  });

  it("returns the same week tag for every day Mon..Sun of an ISO week", () => {
    // Pick W22 2026: Mon 25 → Sun 31.
    const seen = new Set<string>();
    for (let day = 25; day <= 31; day += 1) {
      seen.add(isoWeekTag(new Date(Date.UTC(2026, 4, day))));
    }
    expect(seen.size).toBe(1);
    expect(seen.has("2026-W22")).toBe(true);
  });
});

describe("isoWeekStartUtc", () => {
  it("returns Monday 00:00 UTC for any day inside the ISO week", () => {
    const monday = isoWeekStartUtc(new Date(Date.UTC(2026, 4, 31, 14, 30)));
    expect(monday.toISOString()).toBe("2026-05-25T00:00:00.000Z");
  });

  it("is a no-op (modulo time) when called with a Monday already", () => {
    const monday = isoWeekStartUtc(new Date(Date.UTC(2026, 4, 25)));
    expect(monday.toISOString()).toBe("2026-05-25T00:00:00.000Z");
  });
});
