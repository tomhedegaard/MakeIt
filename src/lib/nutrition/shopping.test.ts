import { describe, expect, it } from "vitest";
import type { Meal } from "@/lib/data/nutrition";
import { aggregateShopping } from "./shopping";

function meal(ingredients: Meal["ingredients"]): Meal {
  return {
    id: "m1",
    planId: "p1",
    dayIndex: 0,
    slot: "frokost",
    kind: "recipe",
    title: "Test",
    description: null,
    ingredients,
    steps: [],
    estKcal: 500,
    estProteinG: 30,
    estCarbsG: 40,
    estFatG: 12,
    carbDensity: "standard",
    prepMinutes: 10,
    swappable: true,
    position: 0,
    imageUrl: null,
    imageThumbUrl: null,
    imageAttributionName: null,
    imageAttributionUrl: null,
  };
}

function itemsIn(list: ReturnType<typeof aggregateShopping>, category: string) {
  return list.groups.find((g) => g.category === category)?.items ?? [];
}

describe("aggregateShopping", () => {
  it("puts edamame, tofu and lentils under bælgfrugter — not kød & æg", () => {
    const list = aggregateShopping({
      meals: [
        meal([
          { name: "edamame", amount: 100, unit: "g" },
          { name: "fast tofu", amount: 200, unit: "g" },
          { name: "røde linser", amount: 150, unit: "g" },
          { name: "æg", amount: 3, unit: "stk" },
        ]),
      ],
      householdSize: 1,
    });

    const meat = itemsIn(list, "proteins");
    const plant = itemsIn(list, "plant");
    expect(plant.map((i) => i.name)).toEqual(
      expect.arrayContaining(["edamame", "fast tofu", "røde linser"]),
    );
    const meatNames = meat.map((i) => i.name.toLowerCase());
    expect(meatNames).toContain("æg");
    expect(meatNames).not.toContain("edamame");
    expect(meatNames.some((n) => n.includes("tofu"))).toBe(false);
    expect(meatNames.some((n) => n.includes("linse"))).toBe(false);
    expect(list.groups.find((g) => g.category === "plant")?.label).toBe(
      "Bælgfrugter & tofu",
    );
  });

  it("merges gulerod / gulerødder into one carrots line", () => {
    const list = aggregateShopping({
      meals: [
        meal([{ name: "gulerod", amount: 1, unit: "stk" }]),
        meal([{ name: "gulerødder", amount: 2, unit: "stk" }]),
      ],
      householdSize: 1,
    });
    const carbs = itemsIn(list, "carbs");
    const carrot = carbs.filter((i) => i.name.toLowerCase() === "gulerødder");
    expect(carrot).toHaveLength(1);
    expect(carrot[0].amount).toBe(3);
  });
});
