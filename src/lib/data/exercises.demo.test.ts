import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => null }));

const { listPublishedExerciseFacets, listPublishedExercises } = await import("./exercises");

describe("exercise library in demo mode", () => {
  it("lists all 20 mocks without filters", async () => {
    expect(await listPublishedExercises()).toHaveLength(20);
  });

  it("searches by name", async () => {
    const hits = await listPublishedExercises({ q: "squat" });
    expect(hits.map((e) => e.slug).sort()).toEqual(["back-squat", "front-squat"]);
  });

  it("combines search with equipment", async () => {
    const all = await listPublishedExercises({ q: "press" });
    const barbell = await listPublishedExercises({ q: "press", equipment: "barbell" });
    expect(all.length).toBeGreaterThan(0);
    expect(barbell.every((e) => e.equipment === "barbell")).toBe(true);
    expect(await listPublishedExercises({ q: "squat", equipment: "kettlebell" })).toEqual([]);
  });

  it("reports the categories and equipment that occur, in taxonomy order", async () => {
    const facets = await listPublishedExerciseFacets();
    expect(facets.categories[0]).toBe("lower-body");
    expect(facets.categories).toContain("core");
    expect(facets.equipment[0]).toBe("barbell");
    expect(facets.equipment).not.toContain("sled");
  });
});
