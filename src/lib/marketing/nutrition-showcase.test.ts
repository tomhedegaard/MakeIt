import { describe, expect, it } from "vitest";
import {
  getShowcaseNutritionDay,
  MEAL_STILLS,
} from "./nutrition-showcase";

describe("getShowcaseNutritionDay", () => {
  it("uses day-0 titles from the mock plan generator", () => {
    const day = getShowcaseNutritionDay();
    expect(day.meals.map((m) => m.slot)).toEqual(["morgen", "frokost", "aften"]);
    expect(day.meals.map((m) => m.title)).toEqual(Object.keys(MEAL_STILLS));
  });

  it("exposes daily targets and three stills with photographers", () => {
    const day = getShowcaseNutritionDay();
    expect(day.dailyKcal).toBe(2400);
    expect(day.dailyProteinG).toBe(180);
    expect(day.meals).toHaveLength(3);
    for (const meal of day.meals) {
      expect(meal.imageSrc).toMatch(/^\/marketing\/meals\/.+\.jpg$/);
      expect(meal.photographer.length).toBeGreaterThan(0);
      expect(meal.estKcal).toBeGreaterThan(0);
    }
    expect(day.photographers).toEqual([
      "Brooke Lark",
      "Casey Lee",
      "Sheri Silver",
    ]);
  });
});
