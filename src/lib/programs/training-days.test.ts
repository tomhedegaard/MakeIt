import { describe, expect, it } from "vitest";
import { progressWeek } from "@/lib/data/program-generator";
import { trainingDayOffset, trainingDaysPerWeek } from "./training-days";

const offsets = (count: number, perWeek: number) =>
  Array.from({ length: count }, (_, i) => trainingDayOffset(i, perWeek));

describe("trainingDayOffset", () => {
  it("spreads a week's sessions with rest days between", () => {
    expect(offsets(3, 3)).toEqual([0, 2, 4]);
    expect(offsets(4, 4)).toEqual([0, 1, 3, 4]);
    expect(offsets(5, 5)).toEqual([0, 1, 2, 4, 5]);
  });

  it("carries extra sessions into the next week instead of doubling up", () => {
    expect(offsets(4, 3)).toEqual([0, 2, 4, 7]);
    expect(offsets(8, 4)).toEqual([0, 1, 3, 4, 7, 8, 10, 11]);
  });

  it("never puts two sessions on one day", () => {
    for (let perWeek = 1; perWeek <= 7; perWeek++) {
      const days = offsets(30, perWeek);
      expect(new Set(days).size).toBe(days.length);
    }
  });

  it("falls back for a missing or out-of-range frequency", () => {
    expect(trainingDaysPerWeek(null, 4)).toBe(4);
    expect(trainingDaysPerWeek(9, 4)).toBe(7);
    expect(trainingDaysPerWeek("3", 4)).toBe(3);
  });
});

describe("progressWeek scheduling", () => {
  const session = (i: number) => ({ day_label: `Dag ${i}`, title: "t", estimated_minutes: 60, exercises: [] });

  it("gives a 5-session week five different days (the old fixed pattern doubled day 4)", () => {
    const next = progressWeek([1, 2, 3, 4, 5].map(session), false);
    expect(next.map((s) => s.scheduledOffsetDays)).toEqual([0, 1, 2, 4, 5]);
  });

  it("follows the member's frequency", () => {
    const next = progressWeek([1, 2, 3, 4].map(session), false, undefined, 3);
    expect(next.map((s) => s.scheduledOffsetDays)).toEqual([0, 2, 4, 7]);
  });
});
