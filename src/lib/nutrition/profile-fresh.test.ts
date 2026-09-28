import { describe, expect, it } from "vitest";
import { isNutritionProfileFresh } from "./profile-fresh";

describe("isNutritionProfileFresh", () => {
  it("treats a default profile with no plan or weigh-in as fresh", () => {
    expect(
      isNutritionProfileFresh({
        plan: null,
        latestWeight: null,
        profile: { goal: "maintain", dailyKcalTarget: null },
      }),
    ).toBe(true);
    expect(
      isNutritionProfileFresh({
        plan: null,
        latestWeight: null,
        profile: { goal: null, dailyKcalTarget: null },
      }),
    ).toBe(true);
  });

  it("is not fresh once a plan, weigh-in, goal, or kcal target exists", () => {
    expect(
      isNutritionProfileFresh({
        plan: { id: "p1" },
        latestWeight: null,
        profile: { goal: "maintain", dailyKcalTarget: null },
      }),
    ).toBe(false);
    expect(
      isNutritionProfileFresh({
        plan: null,
        latestWeight: { id: "w1" },
        profile: { goal: "maintain", dailyKcalTarget: null },
      }),
    ).toBe(false);
    expect(
      isNutritionProfileFresh({
        plan: null,
        latestWeight: null,
        profile: { goal: "cut", dailyKcalTarget: null },
      }),
    ).toBe(false);
    expect(
      isNutritionProfileFresh({
        plan: null,
        latestWeight: null,
        profile: { goal: "maintain", dailyKcalTarget: 2400 },
      }),
    ).toBe(false);
  });
});
