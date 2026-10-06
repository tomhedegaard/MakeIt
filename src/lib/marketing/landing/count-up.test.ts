import { describe, expect, it } from "vitest";
import { countUpAt, weekTotal } from "./count-up";
import { MEAL_WEEK } from "./meal-week";

describe("countUpAt", () => {
  it("starts at zero and lands exactly on the target", () => {
    expect(countUpAt(0, 3770)).toBe(0);
    expect(countUpAt(1, 3770)).toBe(3770);
  });

  it("eases out: past half way at the midpoint", () => {
    expect(countUpAt(0.5, 100)).toBe(88);
  });

  it("clamps progress outside 0 to 1", () => {
    expect(countUpAt(-1, 50)).toBe(0);
    expect(countUpAt(2, 50)).toBe(50);
  });
});

describe("weekTotal", () => {
  it("sums the example week", () => {
    expect(weekTotal(MEAL_WEEK, (m) => m.kcal)).toBe(3770);
    expect(weekTotal(MEAL_WEEK, (m) => m.protein)).toBe(240);
  });
});
