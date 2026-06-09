import { describe, expect, it } from "vitest";
import { currentStreak, longestStreak, newlyHitMilestones, utcDateNDaysAgo } from "./streak";

const today = new Date("2026-06-07T12:00:00Z");

function log(daysAgo: number) {
  return { logged_date: utcDateNDaysAgo(daysAgo, today) };
}

describe("currentStreak", () => {
  it("0 when no logs", () => {
    expect(currentStreak([], today)).toBe(0);
  });

  it("0 when last log is 2+ days ago", () => {
    expect(currentStreak([log(2), log(3)], today)).toBe(0);
  });

  it("1 when only today logged", () => {
    expect(currentStreak([log(0)], today)).toBe(1);
  });

  it("1 when only yesterday logged (today still open)", () => {
    expect(currentStreak([log(1)], today)).toBe(1);
  });

  it("5 when consecutive today through 4 days ago", () => {
    expect(currentStreak([log(0), log(1), log(2), log(3), log(4)], today)).toBe(5);
  });

  it("5 when starting at yesterday (today not yet logged)", () => {
    expect(currentStreak([log(1), log(2), log(3), log(4), log(5)], today)).toBe(5);
  });

  it("stops at two-day gap (grace covers one missed day, second breaks)", () => {
    // Two consecutive missed days at positions 5,6 → streak breaks.
    expect(currentStreak([log(0), log(1), log(2), log(3), log(4), log(7)], today)).toBe(5);
  });

  it("dedupes duplicate logged_date entries", () => {
    expect(currentStreak([log(0), log(0), log(1)], today)).toBe(2);
  });
});

describe("currentStreak grace day", () => {
  it("uses one grace to bridge a single-day gap", () => {
    // Logs: today, yesterday, [gap day 2], 3 days ago, 4 days ago
    expect(currentStreak([log(0), log(1), log(3), log(4)], today)).toBe(4);
  });

  it("breaks on two consecutive missed days", () => {
    // Logs: today, yesterday, then two gaps at day 2 and day 3
    expect(currentStreak([log(0), log(1), log(4), log(5)], today)).toBe(2);
  });

  it("does not re-use grace inside cooldown window (7d)", () => {
    // Day 0,1 logged. Gap at 2 (grace). Day 3 logged. Gap at 4 (cooldown blocks).
    expect(currentStreak([log(0), log(1), log(3), log(5), log(6)], today)).toBe(3);
  });

  it("allows a second grace after the cooldown window has passed", () => {
    // Day 0,1 logged. Gap at 2 (grace #1). Day 3..8 logged. Gap at 9 (cooldown OK).
    const logs = [log(0), log(1), log(3), log(4), log(5), log(6), log(7), log(8), log(10)];
    expect(currentStreak(logs, today)).toBe(9);
  });

  it("does not count the grace day itself", () => {
    // 3 entries with 1 gap. Streak = 3 days you actually logged, not 4.
    expect(currentStreak([log(0), log(2), log(3)], today)).toBe(3);
  });

  it("grace is only available after streak has started", () => {
    // Just today logged, then gap, gap. No grace can rescue this.
    expect(currentStreak([log(0)], today)).toBe(1);
  });
});

describe("longestStreak", () => {
  it("0 when no logs", () => {
    expect(longestStreak([])).toBe(0);
  });

  it("1 when single log", () => {
    expect(longestStreak([log(5)])).toBe(1);
  });

  it("finds the longest historical run when current is shorter", () => {
    // 4-day run 30-33 days ago + 2-day run today/yesterday
    const logs = [log(0), log(1), log(30), log(31), log(32), log(33)];
    expect(longestStreak(logs)).toBe(4);
  });
});

describe("newlyHitMilestones", () => {
  it("returns empty for no new milestone", () => {
    expect(newlyHitMilestones(2, 3)).toEqual([3]);
    expect(newlyHitMilestones(3, 4)).toEqual([]);
  });

  it("returns multiple if jumping past several", () => {
    expect(newlyHitMilestones(0, 7)).toEqual([3, 7]);
  });

  it("returns empty when streak decreased", () => {
    expect(newlyHitMilestones(7, 1)).toEqual([]);
  });
});
