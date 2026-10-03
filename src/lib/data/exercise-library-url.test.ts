import { describe, expect, it } from "vitest";
import { libraryHref, normalizeSearch, pickFacet } from "./exercise-library-url";

describe("libraryHref", () => {
  it("is the bare library path with no filters", () => {
    expect(libraryHref()).toBe("/train/exercises");
    expect(libraryHref({ q: "  ", category: null, equipment: "" })).toBe("/train/exercises");
  });

  it("keeps only the filters that are set, in a stable order", () => {
    expect(libraryHref({ equipment: "barbell", q: "squat" })).toBe("/train/exercises?q=squat&equipment=barbell");
    expect(libraryHref({ category: "cardio" })).toBe("/train/exercises?category=cardio");
  });

  it("encodes the search text", () => {
    expect(libraryHref({ q: "push up & pull" })).toBe("/train/exercises?q=push+up+%26+pull");
  });
});

describe("normalizeSearch", () => {
  it("trims, takes the first of repeated params and caps the length at 80", () => {
    expect(normalizeSearch("  squat ")).toBe("squat");
    expect(normalizeSearch(["row", "curl"])).toBe("row");
    expect(normalizeSearch("x".repeat(200))).toHaveLength(80);
  });

  it("is undefined for missing or blank input", () => {
    expect(normalizeSearch(undefined)).toBeUndefined();
    expect(normalizeSearch("   ")).toBeUndefined();
  });

  it("drops the * wildcard, which the database would otherwise expand", () => {
    expect(normalizeSearch("squ*t")).toBe("squt");
    expect(normalizeSearch("*")).toBeUndefined();
  });
});

describe("pickFacet", () => {
  it("honours a value only when a published exercise has it", () => {
    expect(pickFacet("cardio", ["lower-body", "cardio"])).toBe("cardio");
    expect(pickFacet("made-up", ["lower-body", "cardio"])).toBeUndefined();
    expect(pickFacet(undefined, ["cardio"])).toBeUndefined();
    expect(pickFacet(["cardio", "arms"], ["cardio"])).toBe("cardio");
  });
});
