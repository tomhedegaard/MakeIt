import { describe, it, expect } from "vitest";
import {
  LIFESTYLE_EVENT_TYPES,
  FEELING_STATES,
  validateLifestyleValue,
} from "./lifestyle";

describe("LIFESTYLE_EVENT_TYPES", () => {
  it("contains exactly the 6 event-type strings", () => {
    expect([...LIFESTYLE_EVENT_TYPES]).toEqual([
      "alcohol_drinks",
      "sleep_hours",
      "feeling",
      "late_meal",
      "sick",
      "menstrual_start",
    ]);
  });
});

describe("FEELING_STATES", () => {
  it("contains the four feeling states", () => {
    expect([...FEELING_STATES]).toEqual(["fresh", "ok", "tired", "stressed"]);
  });
});

describe("validateLifestyleValue — alcohol_drinks", () => {
  it("accepts an in-range integer count", () => {
    expect(validateLifestyleValue("alcohol_drinks", { count: 2 })).toEqual({
      count: 2,
    });
  });
  it("clamps a count above 3 down to 3", () => {
    expect(validateLifestyleValue("alcohol_drinks", { count: 5 })).toEqual({
      count: 3,
    });
  });
  it("clamps a negative count up to 0", () => {
    expect(validateLifestyleValue("alcohol_drinks", { count: -1 })).toEqual({
      count: 0,
    });
  });
  it("rounds a fractional count to an integer", () => {
    expect(validateLifestyleValue("alcohol_drinks", { count: 1.7 })).toEqual({
      count: 2,
    });
  });
  it("throws on a non-numeric count", () => {
    expect(() =>
      validateLifestyleValue("alcohol_drinks", { count: "x" }),
    ).toThrow();
  });
  it("throws on a missing count", () => {
    expect(() => validateLifestyleValue("alcohol_drinks", {})).toThrow();
  });
});

describe("validateLifestyleValue — sleep_hours", () => {
  it("accepts an in-range fractional hours value", () => {
    expect(validateLifestyleValue("sleep_hours", { hours: 7.5 })).toEqual({
      hours: 7.5,
    });
  });
  it("clamps hours above 24 down to 24", () => {
    expect(validateLifestyleValue("sleep_hours", { hours: 30 })).toEqual({
      hours: 24,
    });
  });
  it("clamps negative hours up to 0", () => {
    expect(validateLifestyleValue("sleep_hours", { hours: -2 })).toEqual({
      hours: 0,
    });
  });
  it("throws on a non-numeric hours value", () => {
    expect(() =>
      validateLifestyleValue("sleep_hours", { hours: "x" }),
    ).toThrow();
  });
});

describe("validateLifestyleValue — feeling", () => {
  it("accepts a valid feeling state", () => {
    expect(validateLifestyleValue("feeling", { state: "tired" })).toEqual({
      state: "tired",
    });
  });
  it("throws on an unknown feeling state", () => {
    expect(() =>
      validateLifestyleValue("feeling", { state: "ecstatic" }),
    ).toThrow();
  });
  it("throws on a missing state", () => {
    expect(() => validateLifestyleValue("feeling", {})).toThrow();
  });
});

describe("validateLifestyleValue — late_meal", () => {
  it("accepts a boolean late flag", () => {
    expect(validateLifestyleValue("late_meal", { late: true })).toEqual({
      late: true,
    });
  });
  it("throws on a non-boolean late flag", () => {
    expect(() =>
      validateLifestyleValue("late_meal", { late: "yes" }),
    ).toThrow();
  });
});

describe("validateLifestyleValue — sick", () => {
  it("accepts a boolean sick flag", () => {
    expect(validateLifestyleValue("sick", { sick: false })).toEqual({
      sick: false,
    });
  });
  it("throws on a non-boolean sick flag", () => {
    expect(() => validateLifestyleValue("sick", { sick: 1 })).toThrow();
  });
});

describe("validateLifestyleValue — menstrual_start", () => {
  it("accepts a valid YYYY-MM-DD date", () => {
    expect(
      validateLifestyleValue("menstrual_start", { date: "2026-05-19" }),
    ).toEqual({ date: "2026-05-19" });
  });
  it("throws on a non-date string", () => {
    expect(() =>
      validateLifestyleValue("menstrual_start", { date: "not-a-date" }),
    ).toThrow();
  });
  it("throws on an impossible calendar date", () => {
    expect(() =>
      validateLifestyleValue("menstrual_start", { date: "2026-13-99" }),
    ).toThrow();
  });
  it("throws on a missing date", () => {
    expect(() => validateLifestyleValue("menstrual_start", {})).toThrow();
  });
});

describe("validateLifestyleValue — invalid inputs", () => {
  it("throws on an unknown event type", () => {
    expect(() => validateLifestyleValue("unknown_type", {})).toThrow();
  });
  it("throws on a null value", () => {
    expect(() =>
      validateLifestyleValue("alcohol_drinks", null),
    ).toThrow();
  });
});
