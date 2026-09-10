import { describe, expect, it } from "vitest";
import {
  commitStepperInput,
  formatStepperNumber,
  normalizeStepperNumber,
  parseStepperNumber,
} from "./stepper-value";

describe("parseStepperNumber", () => {
  it("parses dot and comma decimals", () => {
    expect(parseStepperNumber("82.5")).toBe(82.5);
    expect(parseStepperNumber("82,5")).toBe(82.5);
    expect(parseStepperNumber(" 80 ")).toBe(80);
  });

  it("leaves incomplete tokens uncommitted", () => {
    expect(parseStepperNumber("")).toBeNull();
    expect(parseStepperNumber(".")).toBeNull();
    expect(parseStepperNumber("82.")).toBeNull();
    expect(parseStepperNumber("-")).toBeNull();
  });

  it("rejects non-numeric junk", () => {
    expect(parseStepperNumber("82,5,0")).toBeNull();
    expect(parseStepperNumber("kg")).toBeNull();
  });
});

describe("normalizeStepperNumber", () => {
  it("keeps typed kg values off the step grid", () => {
    expect(normalizeStepperNumber(83, 0, 999, 2.5)).toBe(83);
    expect(normalizeStepperNumber(82.5, 0, 999, 2.5)).toBe(82.5);
  });

  it("rounds integer steps (reps) and clamps", () => {
    expect(normalizeStepperNumber(5.4, 0, 999, 1)).toBe(5);
    expect(normalizeStepperNumber(5.6, 0, 999, 1)).toBe(6);
    expect(normalizeStepperNumber(-2, 0, 999, 2.5)).toBe(0);
    expect(normalizeStepperNumber(1200, 0, 999, 2.5)).toBe(999);
  });
});

describe("commitStepperInput", () => {
  it("commits a typed 82.5 kg value", () => {
    expect(commitStepperInput("82.5", 0, 999, 2.5)).toBe(82.5);
    expect(commitStepperInput("82,5", 0, 999, 2.5)).toBe(82.5);
  });

  it("returns null while the member is still typing", () => {
    expect(commitStepperInput("82.", 0, 999, 2.5)).toBeNull();
  });
});

describe("formatStepperNumber", () => {
  it("drops trailing zeros", () => {
    expect(formatStepperNumber(80)).toBe("80");
    expect(formatStepperNumber(82.5)).toBe("82.5");
  });
});
