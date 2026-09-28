import { describe, expect, it } from "vitest";
import {
  catalogProgramForProfile,
  generateRuleBased,
} from "./program-generator";

describe("catalogProgramForProfile", () => {
  it("maps onboarding goals to published catalog codes", () => {
    expect(catalogProgramForProfile("strength")).toEqual({
      programCode: "STR-12",
      programName: "PR-Block",
    });
    expect(catalogProgramForProfile("hybrid")).toEqual({
      programCode: "STR-12",
      programName: "PR-Block",
    });
    expect(catalogProgramForProfile("hypertrophy")).toEqual({
      programCode: "HYP-08",
      programName: "Build Phase",
    });
    expect(catalogProgramForProfile("deadlift_spec")).toEqual({
      programCode: "DL-06",
      programName: "Deadlift Specialization",
    });
  });
});

describe("generateRuleBased", () => {
  it("uses the same catalog choice as DONE materialize", () => {
    const profile = {
      goalFocus: "hypertrophy" as const,
      experienceLevel: "intermediate" as const,
      weeklyFrequency: 4,
      equipmentLevel: "full" as const,
    };
    const generated = generateRuleBased(profile);
    expect(generated.programCode).toBe(
      catalogProgramForProfile("hypertrophy").programCode,
    );
    expect(generated.programName).toBe(
      catalogProgramForProfile("hypertrophy").programName,
    );
    expect(generated.sessions.length).toBeGreaterThan(0);
  });
});
