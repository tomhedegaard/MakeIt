import { describe, expect, it } from "vitest";
import { rangeFill } from "./range";

const fill = (v: number, min: number, max: number) => (rangeFill(v, min, max) as Record<string, string>)["--fill"];

describe("rangeFill", () => {
  it("maps the value onto 0–100 % of the track", () => {
    expect(fill(1, 1, 5)).toBe("0%");
    expect(fill(3, 1, 5)).toBe("50%");
    expect(fill(5, 1, 5)).toBe("100%");
  });

  it("clamps values outside the range", () => {
    expect(fill(-2, 0, 10)).toBe("0%");
    expect(fill(12, 0, 10)).toBe("100%");
  });

  it("is empty for a degenerate range instead of dividing by zero", () => {
    expect(fill(0, 0, 0)).toBe("0%");
  });

  it("rounds to two decimals so the inline style stays short", () => {
    expect(fill(1, 0, 3)).toBe("33.33%");
  });
});
