import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SYNTHETIC_PROGRAM_CODE_PREFIX,
  canMemberAssignProgram,
  excludeSyntheticPrograms,
  isSyntheticProgramCode,
} from "./synthetic";

const seed = readFileSync(
  new URL("../../../scripts/seed-adaptive-demo.mjs", import.meta.url),
  "utf8",
);
const librarySrc = readFileSync(
  new URL("../data/coaching.ts", import.meta.url),
  "utf8",
);
const actionsSrc = readFileSync(
  new URL("../../app/(app)/coaching/actions.ts", import.meta.url),
  "utf8",
);
const coachAssignSrc = readFileSync(
  new URL("../../app/coach/programs/actions.ts", import.meta.url),
  "utf8",
);
const startButtonSrc = readFileSync(
  new URL("../../app/(app)/coaching/StartProgramButton.tsx", import.meta.url),
  "utf8",
);
const detailSrc = readFileSync(
  new URL("../data/program-detail.ts", import.meta.url),
  "utf8",
);

describe("isSyntheticProgramCode", () => {
  it("excludes ADAPTIVE-DEMO-STR and other ADAPTIVE-DEMO* codes", () => {
    expect(isSyntheticProgramCode("ADAPTIVE-DEMO-STR")).toBe(true);
    expect(isSyntheticProgramCode("ADAPTIVE-DEMO")).toBe(true);
    expect(isSyntheticProgramCode("ADAPTIVE-DEMO-HYP")).toBe(true);
    expect(isSyntheticProgramCode("adaptive-demo-str")).toBe(true);
    expect(isSyntheticProgramCode("  ADAPTIVE-DEMO-STR  ")).toBe(true);
  });

  it("keeps real library codes", () => {
    expect(isSyntheticProgramCode("STR-12")).toBe(false);
    expect(isSyntheticProgramCode("HYP-08")).toBe(false);
    expect(isSyntheticProgramCode("STR-ADAPTIVE-DEMO")).toBe(false);
    expect(isSyntheticProgramCode("")).toBe(false);
    expect(isSyntheticProgramCode(null)).toBe(false);
  });
});

describe("excludeSyntheticPrograms", () => {
  it("drops ADAPTIVE-DEMO-STR from a member library list", () => {
    const listed = excludeSyntheticPrograms([
      { code: "STR-12", name: "PR-Block" },
      {
        code: "ADAPTIVE-DEMO-STR",
        name: "Adaptive Demo · Strength",
      },
      { code: "HYP-08", name: "Build Phase" },
    ]);
    expect(listed.map((p) => p.code)).toEqual(["STR-12", "HYP-08"]);
  });
});

describe("canMemberAssignProgram", () => {
  it("refuses denylisted codes even when published", () => {
    expect(
      canMemberAssignProgram({
        code: "ADAPTIVE-DEMO-STR",
        isPublished: true,
      }),
    ).toBe(false);
    expect(
      canMemberAssignProgram({ code: "STR-12", isPublished: true }),
    ).toBe(true);
    expect(
      canMemberAssignProgram({ code: "STR-12", isPublished: false }),
    ).toBe(false);
  });
});

describe("seed-adaptive-demo unpublished", () => {
  it("inserts and re-seeds ADAPTIVE-DEMO-STR with is_published false", () => {
    expect(seed).toContain(`DEMO_PROGRAM_CODE = "ADAPTIVE-DEMO-STR"`);
    expect(seed).toContain(SYNTHETIC_PROGRAM_CODE_PREFIX);
    expect(seed).toMatch(/is_published:\s*false/);
    // Re-run must unpublish a row ops (or an older seed) left public.
    expect(seed).toMatch(
      /\.update\(\{[\s\S]*is_published:\s*false[\s\S]*\}\)/,
    );
  });
});

describe("member surfaces use the denylist", () => {
  it("filters the library and refuses assign / detail of synthetic codes", () => {
    expect(librarySrc).toContain("excludeSyntheticPrograms");
    expect(actionsSrc).toContain("canMemberAssignProgram");
    expect(detailSrc).toContain("isSyntheticProgramCode");
  });
});

describe("member start shares blueprint materialization", () => {
  it("uses the shared helper instead of assignment-only insert", () => {
    expect(actionsSrc).toContain("assignProgramFromBlueprint");
    expect(actionsSrc).toContain("supersedeStatus: \"paused\"");
    expect(actionsSrc).toContain("empty_days");
    expect(actionsSrc).not.toMatch(
      /from\("program_assignments"\)\.insert\(\{[\s\S]*status:\s*"active"/,
    );
    expect(coachAssignSrc).toContain("assignProgramFromBlueprint");
    expect(coachAssignSrc).toContain("supersedeStatus: \"abandoned\"");
    expect(coachAssignSrc).toContain("Kan ikke publicere et program uden dage");
  });

  it("wires StartProgramButton to pending, failure, and empty-day disable", () => {
    expect(startButtonSrc).toContain("hasDays");
    expect(startButtonSrc).toContain("role=\"alert\"");
    expect(startButtonSrc).toContain("setError");
    expect(startButtonSrc).toContain("t(\"starting\")");
    expect(startButtonSrc).toContain("disabled={pending || !hasDays}");
  });
});
