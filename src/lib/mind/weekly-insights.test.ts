import { describe, expect, it } from "vitest";
import { computeWeeklyInsights, headlineFromInsights } from "./weekly-insights";
import { utcDateNDaysAgo } from "./streak";

const today = new Date("2026-06-08T12:00:00Z");

function log(daysAgo: number, e = 3, s = 3, f = 3) {
  return {
    logged_date: utcDateNDaysAgo(daysAgo, today),
    energy: e,
    stress: s,
    focus: f,
  };
}
function completion(daysAgo: number) {
  return { completed_date: utcDateNDaysAgo(daysAgo, today) };
}
function journal(daysAgo: number) {
  return { logged_date: utcDateNDaysAgo(daysAgo, today) };
}

describe("computeWeeklyInsights", () => {
  it("returns zeros when no data exists", () => {
    const w = computeWeeklyInsights([], [], [], today);
    expect(w.current.mindCheckDays).toBe(0);
    expect(w.consistency.daysLogged).toBe(0);
    expect(w.consistency.daysExpected).toBe(7);
  });

  it("includes days 0-6 in the current week and 7-13 in prior", () => {
    const logs = [log(0, 4), log(3, 4), log(7, 2), log(10, 2)];
    const w = computeWeeklyInsights(logs, [], [], today);
    expect(w.current.mindCheckDays).toBe(2);
    expect(w.current.energyMedian).toBe(4);
    expect(w.prior.mindCheckDays).toBe(2);
    expect(w.prior.energyMedian).toBe(2);
    expect(w.delta.energy).toBe(2);
  });

  it("counts completions per week independently", () => {
    const w = computeWeeklyInsights(
      [log(0)],
      [completion(0), completion(2), completion(8)],
      [],
      today,
    );
    expect(w.current.sessionsCompleted).toBe(2);
    expect(w.prior.sessionsCompleted).toBe(1);
    expect(w.delta.sessionsCompleted).toBe(1);
  });

  it("counts journal entries per week independently", () => {
    const w = computeWeeklyInsights(
      [],
      [],
      [journal(1), journal(5), journal(9)],
      today,
    );
    expect(w.current.journalEntries).toBe(2);
    expect(w.prior.journalEntries).toBe(1);
  });
});

describe("headlineFromInsights", () => {
  it("nudges to log when no current data", () => {
    const txt = headlineFromInsights(computeWeeklyInsights([], [], [], today));
    expect(txt).toMatch(/mangler|start/i);
  });

  it("celebrates stress drop", () => {
    const logs = [
      log(0, 3, 1), log(1, 3, 1), log(2, 3, 1),
      log(7, 3, 4), log(8, 3, 4), log(9, 3, 4),
    ];
    const txt = headlineFromInsights(computeWeeklyInsights(logs, [], [], today));
    expect(txt).toMatch(/stress er nede/i);
  });

  it("celebrates consistent week", () => {
    const logs = Array.from({ length: 7 }, (_, i) => log(i, 3, 3, 3));
    const txt = headlineFromInsights(computeWeeklyInsights(logs, [], [], today));
    expect(txt).toMatch(/st(æ|e)rk uge|7 af 7/i);
  });
});
