import { describe, expect, it } from "vitest";
import {
  ACUTE_COOLDOWN_HOURS,
  CONCERN_COOLDOWN_DAYS,
  evaluateSignals,
  inCooldown,
  levelOf,
} from "./signals";

const TODAY = "2026-10-15";
/** Copenhagen days before TODAY: day(1) is yesterday. */
function day(n: number): string {
  const d = new Date(Date.parse(`${TODAY}T00:00:00Z`) - n * 86_400_000);
  return d.toISOString().slice(0, 10);
}
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => day(a + i));

describe("evaluateSignals: daily training", () => {
  it("fires at 12 of the last 14 days", () => {
    const hits = evaluateSignals(range(1, 12), TODAY);
    expect(hits).toEqual([
      { signal: "daily_training", detail: { trainedDays: 12, windowDays: 14 }, observedFrom: day(14), observedTo: day(1) },
    ]);
  });

  it("stays quiet at 11 of 14 days", () => {
    expect(evaluateSignals(range(1, 11), TODAY)).toEqual([]);
  });

  it("stays quiet on the prescribed three days a week", () => {
    expect(evaluateSignals([day(1), day(3), day(5), day(8), day(10), day(12)], TODAY)).toEqual([]);
  });

  it("ignores today and anything older than the window", () => {
    expect(evaluateSignals([TODAY, ...range(1, 11), day(15), day(16)], TODAY)).toEqual([]);
  });

  it("counts a day once however many sessions it had", () => {
    const hits = evaluateSignals([...range(1, 11), day(1), day(1)], TODAY);
    expect(hits.find((h) => h.signal === "daily_training")).toBeUndefined();
  });
});

describe("evaluateSignals: several sessions on the same day", () => {
  it("fires on three double days spread over at least a week", () => {
    const hits = evaluateSignals([day(1), day(1), day(4), day(4), day(8), day(8)], TODAY);
    expect(hits).toEqual([
      { signal: "double_sessions", detail: { doubleDays: 3, windowDays: 14 }, observedFrom: day(14), observedTo: day(1) },
    ]);
  });

  it("stays quiet on three double days inside six days", () => {
    expect(evaluateSignals([day(1), day(1), day(3), day(3), day(6), day(6)], TODAY)).toEqual([]);
  });

  it("stays quiet on two double days", () => {
    expect(evaluateSignals([day(1), day(1), day(10), day(10)], TODAY)).toEqual([]);
  });
});

describe("cooldown", () => {
  const now = new Date("2026-10-15T07:00:00Z");
  it("holds a concern sign for 14 days", () => {
    const justInside = new Date(now.getTime() - (CONCERN_COOLDOWN_DAYS * 24 - 1) * 3_600_000);
    const justOutside = new Date(now.getTime() - CONCERN_COOLDOWN_DAYS * 24 * 3_600_000);
    expect(inCooldown("daily_training", justInside, now)).toBe(true);
    expect(inCooldown("daily_training", justOutside, now)).toBe(false);
  });

  it("holds an acute notice for a day only", () => {
    const earlier = new Date(now.getTime() - (ACUTE_COOLDOWN_HOURS - 1) * 3_600_000);
    const dayBefore = new Date(now.getTime() - ACUTE_COOLDOWN_HOURS * 3_600_000);
    expect(inCooldown("crisis_language", earlier, now)).toBe(true);
    expect(inCooldown("crisis_language", dayBefore, now)).toBe(false);
  });

  it("never holds a first notice", () => {
    expect(inCooldown("double_sessions", null, now)).toBe(false);
  });
});

it("only crisis language is acute", () => {
  expect(levelOf("crisis_language")).toBe("acute");
  expect(levelOf("daily_training")).toBe("concern");
  expect(levelOf("double_sessions")).toBe("concern");
});
