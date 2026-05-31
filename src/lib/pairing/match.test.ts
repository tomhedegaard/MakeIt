import { describe, it, expect } from "vitest";
import {
  PAIRING_ALGO_VERSION,
  assignBuddiesForTier,
  engagementComplementScore,
  goalFocusScore,
  hrvPatternScore,
  scorePair,
  sessionFrequencyScore,
  trainingPhaseOffsetScore,
  type MemberFeatures,
} from "./match";

/** Defaults that pass all hard constraints; tests override per case. */
function feat(overrides: Partial<MemberFeatures> & Pick<MemberFeatures, "memberId">): MemberFeatures {
  return {
    language: "da",
    timezoneOffsetHours: 1, // CET
    trainingWeekMod4: 0,
    deload: false,
    hrvPattern: "flat",
    goalFocus: "strength",
    sessionsPer30d: 12,
    repsTrajectory: "stable",
    ...overrides,
  };
}

describe("scoring helpers", () => {
  it("engagement: gaining + stable scores highest", () => {
    expect(engagementComplementScore("gaining", "stable")).toBe(30);
    expect(engagementComplementScore("stable", "gaining")).toBe(30);
    expect(engagementComplementScore("declining", "stable")).toBe(25);
    expect(engagementComplementScore("declining", "declining")).toBe(5);
    expect(engagementComplementScore("unknown", "stable")).toBe(10);
  });

  it("training phase: max offset (cyclic distance 2) wins; deload XOR adds a bonus capped at 20", () => {
    expect(trainingPhaseOffsetScore({ trainingWeekMod4: 0, deload: false }, { trainingWeekMod4: 0, deload: false })).toBe(10);
    expect(trainingPhaseOffsetScore({ trainingWeekMod4: 0, deload: false }, { trainingWeekMod4: 1, deload: false })).toBe(15);
    expect(trainingPhaseOffsetScore({ trainingWeekMod4: 0, deload: false }, { trainingWeekMod4: 2, deload: false })).toBe(20);
    // Cyclic — 3 is equivalent to 1.
    expect(trainingPhaseOffsetScore({ trainingWeekMod4: 0, deload: false }, { trainingWeekMod4: 3, deload: false })).toBe(15);
    // Deload XOR bonus, but factor is capped at 20.
    expect(trainingPhaseOffsetScore({ trainingWeekMod4: 0, deload: true }, { trainingWeekMod4: 2, deload: false })).toBe(20);
    // No XOR (both deload) — pure offset.
    expect(trainingPhaseOffsetScore({ trainingWeekMod4: 0, deload: true }, { trainingWeekMod4: 0, deload: true })).toBe(10);
  });

  it("goal focus: cross-goal preferred over same-goal", () => {
    expect(goalFocusScore("strength", "hypertrophy")).toBe(15);
    expect(goalFocusScore("strength", "strength")).toBe(10);
    expect(goalFocusScore("unknown", "strength")).toBe(5);
  });

  it("hrv pattern: oscillator + flat is the strongest match", () => {
    expect(hrvPatternScore("oscillating", "flat")).toBe(15);
    expect(hrvPatternScore("improving", "improving")).toBe(12);
    expect(hrvPatternScore("flat", "flat")).toBe(5);
    expect(hrvPatternScore("unknown", "unknown")).toBe(0);
  });

  it("session frequency: closer cadence wins", () => {
    expect(sessionFrequencyScore(10, 10)).toBe(20);
    expect(sessionFrequencyScore(10, 11)).toBe(20);
    expect(sessionFrequencyScore(10, 12)).toBe(15);
    expect(sessionFrequencyScore(5, 12)).toBe(5);
  });
});

describe("scorePair (hard constraints)", () => {
  it("returns null when languages differ", () => {
    const a = feat({ memberId: "a", language: "da" });
    const b = feat({ memberId: "b", language: "en" });
    expect(scorePair(a, b)).toBeNull();
  });

  it("returns null when timezone offset exceeds ±2h", () => {
    const a = feat({ memberId: "a", timezoneOffsetHours: 1 });
    const b = feat({ memberId: "b", timezoneOffsetHours: 4 }); // 3h diff
    expect(scorePair(a, b)).toBeNull();
  });

  it("returns a score for a valid pair", () => {
    const a = feat({ memberId: "a", repsTrajectory: "gaining" });
    const b = feat({ memberId: "b", repsTrajectory: "stable" });
    const result = scorePair(a, b);
    expect(result).not.toBeNull();
    expect(result!.total).toBeGreaterThan(0);
    expect(result!.factors).toHaveLength(5);
  });
});

describe("assignBuddiesForTier", () => {
  it("returns [] for pools smaller than 2", () => {
    expect(assignBuddiesForTier([])).toEqual([]);
    expect(assignBuddiesForTier([feat({ memberId: "a" })])).toEqual([]);
  });

  it("pairs two valid members; memberA < memberB lexicographically", () => {
    const pairs = assignBuddiesForTier([
      feat({ memberId: "b" }),
      feat({ memberId: "a" }),
    ]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({
      memberA: "a",
      memberB: "b",
      pairingReason: { algo_version: PAIRING_ALGO_VERSION },
    });
    expect(pairs[0].pairingReason.top_factors).toHaveLength(3);
  });

  it("skips an incompatible pool member (no valid partner)", () => {
    // 3 da-CET + 1 en-UK → 1 pair from the 3 da members, last da + en unpaired.
    const pairs = assignBuddiesForTier([
      feat({ memberId: "da1", language: "da" }),
      feat({ memberId: "da2", language: "da" }),
      feat({ memberId: "da3", language: "da" }),
      feat({ memberId: "en1", language: "en", timezoneOffsetHours: 0 }),
    ]);
    expect(pairs).toHaveLength(1);
    const ids = [pairs[0].memberA, pairs[0].memberB];
    expect(ids).not.toContain("en1");
    // Two da's are paired, one da + en1 are unpaired.
    expect(ids.filter((id) => id.startsWith("da")).length).toBe(2);
  });

  it("prefers complementary engagement over same-direction", () => {
    // Two stable + one gaining; gaining should pair with a stable (score 30),
    // leaving the other stable unpaired (no other partner of higher value).
    const pairs = assignBuddiesForTier([
      feat({ memberId: "stable_x", repsTrajectory: "stable" }),
      feat({ memberId: "stable_y", repsTrajectory: "stable" }),
      feat({ memberId: "gainer",   repsTrajectory: "gaining" }),
    ]);
    expect(pairs).toHaveLength(1);
    const ids = [pairs[0].memberA, pairs[0].memberB];
    expect(ids).toContain("gainer");
  });

  it("is deterministic under input reorder", () => {
    const base = [
      feat({ memberId: "a", repsTrajectory: "gaining" }),
      feat({ memberId: "b", repsTrajectory: "stable" }),
      feat({ memberId: "c", repsTrajectory: "stable", trainingWeekMod4: 2 }),
      feat({ memberId: "d", repsTrajectory: "declining" }),
    ];
    const reversed = [...base].reverse();
    expect(assignBuddiesForTier(base)).toEqual(assignBuddiesForTier(reversed));
  });

  it("pairs four mutually-compatible members into two distinct pairs", () => {
    const pairs = assignBuddiesForTier([
      feat({ memberId: "a", repsTrajectory: "gaining" }),
      feat({ memberId: "b", repsTrajectory: "stable" }),
      feat({ memberId: "c", repsTrajectory: "gaining", trainingWeekMod4: 2 }),
      feat({ memberId: "d", repsTrajectory: "stable", trainingWeekMod4: 2 }),
    ]);
    expect(pairs).toHaveLength(2);
    const allIds = pairs.flatMap((p) => [p.memberA, p.memberB]);
    expect(new Set(allIds).size).toBe(4); // all distinct
  });
});
