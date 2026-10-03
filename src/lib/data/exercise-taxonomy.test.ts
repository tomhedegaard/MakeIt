import { describe, expect, it } from "vitest";
import { TAXONOMY, groupByCategory, orderByTaxonomy } from "./exercise-taxonomy";

describe("TAXONOMY", () => {
  it("has no duplicate values in any group", () => {
    for (const [group, values] of Object.entries(TAXONOMY)) {
      expect(new Set(values).size, group).toBe(values.length);
    }
  });

  it("carries the categories and equipment added with the 2026-10 MoveKit pack", () => {
    expect(TAXONOMY.categories).toEqual(expect.arrayContaining(["power", "mobility", "cardio"]));
    expect(TAXONOMY.equipment).toEqual(
      expect.arrayContaining(["trap-bar", "sled", "suspension", "cardio-machine", "accessory"]),
    );
    expect(TAXONOMY.patterns).toEqual(expect.arrayContaining(["jump", "olympic", "mobility", "conditioning"]));
  });
});

describe("orderByTaxonomy", () => {
  it("orders by the taxonomy, drops duplicates and puts unknown values last, alphabetically", () => {
    expect(orderByTaxonomy("categories", ["cardio", "zeta", "arms", "lower-body", "arms", "alpha"])).toEqual([
      "lower-body",
      "arms",
      "cardio",
      "alpha",
      "zeta",
    ]);
  });

  it("returns an empty list for no values", () => {
    expect(orderByTaxonomy("equipment", [])).toEqual([]);
  });
});

describe("groupByCategory", () => {
  it("groups in taxonomy order, names alphabetical, unknown categories then uncategorised last", () => {
    const groups = groupByCategory([
      { name: "Tempo Run", category: "cardio" },
      { name: "Back Squat", category: "lower-body" },
      { name: "Air Squat", category: "lower-body" },
      { name: "Mystery", category: "odd" },
      { name: "No Category", category: null },
    ]);
    expect(groups.map((g) => g.category)).toEqual(["lower-body", "cardio", "odd", null]);
    expect(groups[0].items.map((i) => i.name)).toEqual(["Air Squat", "Back Squat"]);
  });

  it("does not mutate its input", () => {
    const input = [
      { name: "B", category: "arms" },
      { name: "A", category: "arms" },
    ];
    groupByCategory(input);
    expect(input.map((i) => i.name)).toEqual(["B", "A"]);
  });
});
