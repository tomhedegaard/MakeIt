import { describe, expect, it } from "vitest";
import { TIERS, tierForReps, progressToNext } from "./tiers";

describe("marketing tiers", () => {
  it("lists the four tiers with their reps floors", () => {
    expect(TIERS.map((t) => [t.key, t.from])).toEqual([
      ["lifter", 0], ["athlete", 1000], ["beast", 5000], ["legend", 15000],
    ]);
  });

  it("maps reps to a tier on the floor boundaries", () => {
    expect(tierForReps(0).key).toBe("lifter");
    expect(tierForReps(999).key).toBe("lifter");
    expect(tierForReps(1000).key).toBe("athlete");
    expect(tierForReps(14999).key).toBe("beast");
    expect(tierForReps(15000).key).toBe("legend");
  });

  it("reports progress toward the next tier, and null at the top", () => {
    expect(progressToNext(1240)).toEqual({ next: "beast", at: 5000, ratio: 0.248 });
    expect(progressToNext(20000)).toBeNull();
  });
});
