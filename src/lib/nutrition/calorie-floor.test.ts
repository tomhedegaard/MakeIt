import { describe, expect, it } from "vitest";
import { calorieFloor } from "./calorie-floor";

describe("calorieFloor", () => {
  it("uses 1.800 when sex is unknown, 1.500 for women, 1.800 for men", () => {
    expect(calorieFloor()).toBe(1800);
    expect(calorieFloor({ sex: "f" })).toBe(1500);
    expect(calorieFloor({ sex: "m" })).toBe(1800);
  });

  it("never goes below the resting metabolic rate", () => {
    expect(calorieFloor({ sex: "f", bmrKcal: 1620.4 })).toBe(1620);
    expect(calorieFloor({ sex: "m", bmrKcal: 2050 })).toBe(2050);
    expect(calorieFloor({ sex: "m", bmrKcal: 1400 })).toBe(1800);
  });
});
