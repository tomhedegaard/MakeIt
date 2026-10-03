import { describe, expect, it } from "vitest";
import { escapeLike, facetsOf, matchesFilters } from "./exercise-filters";

const squat = { name: "Back Squat", category: "lower-body", equipment: "barbell", pattern: "squat", difficulty: "intermediate" as const };
const run = { name: "Tempo Run", category: "cardio", equipment: "bodyweight", pattern: "conditioning", difficulty: "beginner" as const };

describe("matchesFilters", () => {
  it("matches everything with no filters", () => {
    expect(matchesFilters(squat, {})).toBe(true);
  });

  it("searches the name as a case-insensitive substring", () => {
    expect(matchesFilters(squat, { q: "squat" })).toBe(true);
    expect(matchesFilters(squat, { q: "  SQUA " })).toBe(true);
    expect(matchesFilters(run, { q: "squat" })).toBe(false);
  });

  it("treats a blank search as no search", () => {
    expect(matchesFilters(run, { q: "   " })).toBe(true);
  });

  it("combines search with category and equipment", () => {
    expect(matchesFilters(squat, { q: "squat", category: "lower-body", equipment: "barbell" })).toBe(true);
    expect(matchesFilters(squat, { q: "squat", equipment: "dumbbell" })).toBe(false);
    expect(matchesFilters(squat, { category: "cardio" })).toBe(false);
  });

  it("filters on pattern and difficulty as before", () => {
    expect(matchesFilters(squat, { pattern: "hinge" })).toBe(false);
    expect(matchesFilters(squat, { difficulty: "intermediate" })).toBe(true);
  });
});

describe("escapeLike", () => {
  it("escapes the LIKE wildcards and the escape character", () => {
    expect(escapeLike("50%")).toBe("50\\%");
    expect(escapeLike("a_b")).toBe("a\\_b");
    expect(escapeLike("back\\slash")).toBe("back\\\\slash");
    expect(escapeLike("squat")).toBe("squat");
  });
});

describe("facetsOf", () => {
  it("lists the categories and equipment that occur, in taxonomy order, unknown last", () => {
    expect(
      facetsOf([
        { category: "cardio", equipment: "cardio-machine" },
        { category: "lower-body", equipment: "barbell" },
        { category: "lower-body", equipment: null },
        { category: null, equipment: "hoverboard" },
      ]),
    ).toEqual({
      categories: ["lower-body", "cardio"],
      equipment: ["barbell", "cardio-machine", "hoverboard"],
    });
  });

  it("is empty for no rows", () => {
    expect(facetsOf([])).toEqual({ categories: [], equipment: [] });
  });
});
