import { describe, expect, it } from "vitest";
import {
  capWeeklyChangeKg,
  copenhagenDate,
  checkPejlemaerke,
  minPejlemaerkeKg,
  restingKcal,
  sevenDayAverages,
  weightDirection,
} from "./body-rules";

describe("pejlemærke limits", () => {
  it("refuses a pejlemærke under BMI 18,5 for the height", () => {
    expect(minPejlemaerkeKg(180)).toBe(60);
    expect(minPejlemaerkeKg(165)).toBe(50.4);
    expect(checkPejlemaerke(60, 180)).toEqual({ ok: true });
    expect(checkPejlemaerke(59.9, 180)).toEqual({ ok: false, reason: "belowHealthy" });
    expect(checkPejlemaerke(80, null)).toEqual({ ok: false, reason: "needsHeight" });
  });
});

describe("restingKcal", () => {
  it("uses Mifflin-St Jeor and needs a known sex", () => {
    const body = { weightKg: 80, heightCm: 180, birthYear: 1990, year: 2026 };
    expect(restingKcal({ ...body, sex: "m" })).toBe(1750);
    expect(restingKcal({ ...body, sex: "f" })).toBe(1584);
    expect(restingKcal({ ...body, sex: "unspecified" })).toBeNull();
    expect(restingKcal({ ...body, heightCm: null, sex: "m" })).toBeNull();
  });
});

describe("capWeeklyChangeKg", () => {
  it("never plans faster than 0,5 % of body weight per week", () => {
    expect(capWeeklyChangeKg(-0.5, 60)).toBeCloseTo(-0.3);
    expect(capWeeklyChangeKg(-0.5, 120)).toBe(-0.5);
    expect(capWeeklyChangeKg(0.25, 40)).toBeCloseTo(0.2);
    expect(capWeeklyChangeKg(-0.5, null)).toBe(-0.5);
  });
});

describe("weight card", () => {
  it("shows 7-day averages, never a single weigh-in", () => {
    const avg = sevenDayAverages(
      [
        { date: "2026-10-01", kg: 96 },
        { date: "2026-10-02", kg: 98 },
        { date: "2026-10-06", kg: 95 },
      ],
      "2026-10-06",
      7,
    );
    expect(avg).toEqual([96, 97, 97, 97, 97, 96.3]);
  });

  it("says a direction, with ±0,3 kg as noise", () => {
    expect(weightDirection([96, 95.5])).toBe("down");
    expect(weightDirection([96, 96.2])).toBe("stable");
    expect(weightDirection([96, 96.4])).toBe("up");
    expect(weightDirection([96])).toBeNull();
  });
});

describe("dates and same-day weigh-ins", () => {
  it("dates a weigh-in in Copenhagen time, not UTC", () => {
    expect(copenhagenDate("2026-10-05T22:30:00Z")).toBe("2026-10-06");
    expect(copenhagenDate("2026-10-06T10:00:00Z")).toBe("2026-10-06");
  });

  it("uses the latest weigh-in of a day (input newest first)", () => {
    const avg = sevenDayAverages(
      [
        { date: "2026-10-06", kg: 95 },
        { date: "2026-10-06", kg: 97 },
      ],
      "2026-10-06",
      1,
    );
    expect(avg).toEqual([95]);
  });
});
