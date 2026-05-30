import { describe, it, expect } from "vitest";
import { pickMembersForCoCoach } from "./assignment";

const ROSTER = ["m-a", "m-b", "m-c", "m-d", "m-e", "m-f"];

describe("pickMembersForCoCoach", () => {
  it("returns [] for count<=0 or empty roster", () => {
    expect(
      pickMembersForCoCoach({
        roster: ROSTER,
        beastId: "m-beast",
        alreadyAssigned: new Set(),
        count: 0,
      }),
    ).toEqual([]);
    expect(
      pickMembersForCoCoach({
        roster: [],
        beastId: "m-beast",
        alreadyAssigned: new Set(),
        count: 3,
      }),
    ).toEqual([]);
  });

  it("returns up to `count` ids (fewer when the eligible pool is smaller)", () => {
    const r = pickMembersForCoCoach({
      roster: ["m-a", "m-b"],
      beastId: "m-beast",
      alreadyAssigned: new Set(),
      count: 5,
    });
    expect(r).toHaveLength(2);
    expect(new Set(r)).toEqual(new Set(["m-a", "m-b"]));
  });

  it("excludes the beast themselves", () => {
    const r = pickMembersForCoCoach({
      roster: ["m-beast", "m-a", "m-b", "m-c"],
      beastId: "m-beast",
      alreadyAssigned: new Set(),
      count: 4,
    });
    expect(r).not.toContain("m-beast");
    expect(r).toHaveLength(3);
  });

  it("excludes members already assigned to any co-coach", () => {
    const r = pickMembersForCoCoach({
      roster: ROSTER,
      beastId: "m-beast",
      alreadyAssigned: new Set(["m-a", "m-c"]),
      count: 3,
    });
    expect(r).not.toContain("m-a");
    expect(r).not.toContain("m-c");
    expect(r).toHaveLength(3);
  });

  it("is deterministic — same input yields the same output across calls", () => {
    const input = {
      roster: ROSTER,
      beastId: "m-beast",
      alreadyAssigned: new Set<string>(),
      count: 3,
    };
    const a = pickMembersForCoCoach(input);
    const b = pickMembersForCoCoach(input);
    expect(a).toEqual(b);
  });

  it("varies the pick by beastId so two co-coaches don't collide on the same shortlist", () => {
    const beasts = ["m-beast-1", "m-beast-2", "m-beast-3"];
    const picks = beasts.map((beastId) =>
      pickMembersForCoCoach({
        roster: ROSTER,
        beastId,
        alreadyAssigned: new Set(),
        count: 3,
      }),
    );
    // At least two of the three Beasts should get a different shortlist.
    const distinctShortlists = new Set(picks.map((p) => p.join("|"))).size;
    expect(distinctShortlists).toBeGreaterThanOrEqual(2);
  });
});
