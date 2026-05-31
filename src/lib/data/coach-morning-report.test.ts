import { describe, it, expect } from "vitest";
import {
  collapseReadinessDays,
  computeSustainedLow,
  groupModifierHistories,
  groupFormCheckHistories,
  avgWaitHours,
  type RawReadingRow,
  type RawModifierRow,
  type RawFormCheckRow,
} from "./coach-morning-report";

const handleOf = new Map([
  ["m1", "nina_dl"],
  ["m2", "maria.lift"],
  ["m3", "kasper_s"],
]);

describe("collapseReadinessDays", () => {
  it("keeps the latest reading per (member, date)", () => {
    const rows: RawReadingRow[] = [
      { memberId: "m1", measuredAt: "2026-05-28T06:00:00.000Z", bucket: "low" },
      { memberId: "m1", measuredAt: "2026-05-28T20:00:00.000Z", bucket: "very_low" },
      { memberId: "m1", measuredAt: "2026-05-29T06:00:00.000Z", bucket: "normal" },
    ];
    const days = collapseReadinessDays(rows, handleOf);
    expect(days).toHaveLength(2);
    const d28 = days.find((d) => d.date === "2026-05-28")!;
    expect(d28.readinessBucket).toBe("very_low"); // 20:00 wins over 06:00
    expect(d28.handle).toBe("nina_dl");
  });

  it("maps unknown members to a dash handle", () => {
    const rows: RawReadingRow[] = [
      { memberId: "ghost", measuredAt: "2026-05-29T06:00:00.000Z", bucket: "low" },
    ];
    expect(collapseReadinessDays(rows, handleOf)[0].handle).toBe("—");
  });
});

describe("computeSustainedLow", () => {
  it("flags a trailing run of low/very_low >= minDays", () => {
    const days = collapseReadinessDays(
      [
        { memberId: "m1", measuredAt: "2026-05-27T06:00:00.000Z", bucket: "normal" },
        { memberId: "m1", measuredAt: "2026-05-28T06:00:00.000Z", bucket: "low" },
        { memberId: "m1", measuredAt: "2026-05-29T06:00:00.000Z", bucket: "very_low" },
      ],
      handleOf,
    );
    const out = computeSustainedLow(days, 2);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ memberId: "m1", handle: "nina_dl", daysLow: 2 });
  });

  it("does not flag a single low day", () => {
    const days = collapseReadinessDays(
      [
        { memberId: "m2", measuredAt: "2026-05-28T06:00:00.000Z", bucket: "normal" },
        { memberId: "m2", measuredAt: "2026-05-29T06:00:00.000Z", bucket: "low" },
      ],
      handleOf,
    );
    expect(computeSustainedLow(days, 2)).toHaveLength(0);
  });

  it("breaks the streak at the first non-low day and sorts by daysLow desc", () => {
    const days = collapseReadinessDays(
      [
        // m1: low, low, low (3)
        { memberId: "m1", measuredAt: "2026-05-27T06:00:00.000Z", bucket: "low" },
        { memberId: "m1", measuredAt: "2026-05-28T06:00:00.000Z", bucket: "very_low" },
        { memberId: "m1", measuredAt: "2026-05-29T06:00:00.000Z", bucket: "low" },
        // m2: normal then low, low (2 trailing)
        { memberId: "m2", measuredAt: "2026-05-27T06:00:00.000Z", bucket: "very_low" },
        { memberId: "m2", measuredAt: "2026-05-28T06:00:00.000Z", bucket: "normal" },
        { memberId: "m2", measuredAt: "2026-05-29T06:00:00.000Z", bucket: "low" },
      ],
      handleOf,
    );
    const out = computeSustainedLow(days, 2);
    // m2's leading very_low is broken by the normal day → trailing run is 1 → excluded.
    expect(out.map((m) => m.memberId)).toEqual(["m1"]);
    expect(out[0].daysLow).toBe(3);
  });
});

describe("groupModifierHistories", () => {
  it("groups per member, oldest-first", () => {
    const rows: RawModifierRow[] = [
      { memberId: "m1", createdAt: "2026-05-29T00:00:00Z", acceptedByMember: false },
      { memberId: "m1", createdAt: "2026-05-27T00:00:00Z", acceptedByMember: true },
      { memberId: "m2", createdAt: "2026-05-28T00:00:00Z", acceptedByMember: null },
    ];
    const out = groupModifierHistories(rows, handleOf);
    const m1 = out.find((h) => h.memberId === "m1")!;
    expect(m1.modifiers.map((m) => m.acceptedByMember)).toEqual([true, false]); // oldest first
    expect(m1.handle).toBe("nina_dl");
    expect(out.find((h) => h.memberId === "m2")!.modifiers).toHaveLength(1);
  });
});

describe("groupFormCheckHistories", () => {
  it("groups per member+exercise, oldest-first, with id fallback to name", () => {
    const rows: RawFormCheckRow[] = [
      { memberId: "m1", exerciseId: "ex-sq", exerciseName: "Squat", score: 80, reviewedAt: "2026-05-29T00:00:00Z" },
      { memberId: "m1", exerciseId: "ex-sq", exerciseName: "Squat", score: 70, reviewedAt: "2026-05-27T00:00:00Z" },
      { memberId: "m1", exerciseId: null, exerciseName: "Deadlift", score: 90, reviewedAt: "2026-05-28T00:00:00Z" },
    ];
    const out = groupFormCheckHistories(rows, handleOf);
    expect(out).toHaveLength(2); // squat + deadlift
    const sq = out.find((h) => h.exerciseId === "ex-sq")!;
    expect(sq.scores.map((s) => s.score)).toEqual([70, 80]); // oldest first
    const dl = out.find((h) => h.exerciseName === "Deadlift")!;
    expect(dl.exerciseId).toBe("Deadlift"); // fallback to name when id null
  });
});

describe("avgWaitHours", () => {
  it("returns 0 for an empty queue", () => {
    expect(avgWaitHours([], new Date())).toBe(0);
  });

  it("averages the wait in hours", () => {
    const now = new Date("2026-05-29T12:00:00.000Z");
    const created = [
      "2026-05-29T10:00:00.000Z", // 2h
      "2026-05-29T08:00:00.000Z", // 4h
    ];
    expect(avgWaitHours(created, now)).toBeCloseTo(3, 5);
  });

  it("clamps future timestamps to 0 wait", () => {
    const now = new Date("2026-05-29T12:00:00.000Z");
    expect(avgWaitHours(["2026-05-29T13:00:00.000Z"], now)).toBe(0);
  });
});
