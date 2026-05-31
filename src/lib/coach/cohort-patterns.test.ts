/**
 * Unit tests for the cohort-pattern detectors (MM-3).
 *
 * Each detector tested in isolation against its threshold edges,
 * plus the orchestrator that concatenates them. The detectors are
 * the analytical heart of the morning report, so the threshold
 * boundaries (≥3 members, ≥1.5 drift, ≥2 streak, >15% decline) get
 * explicit just-below / just-at coverage.
 */

import { describe, expect, it } from "vitest";

import {
  detectCohortPatterns,
  detectEngineRejectStreaks,
  detectFormCheckDeclines,
  detectHrvClusterDays,
  detectRpeDriftProgramWeeks,
  type HrvReadinessDay,
  type MemberFormCheckHistory,
  type MemberModifierHistory,
  type ProgramWeekRpe,
} from "./cohort-patterns";

// =====================================================================
// Detector 1 — hrv_cluster_day
// =====================================================================

describe("detectHrvClusterDays", () => {
  const day = (
    memberId: string,
    date: string,
    bucket: HrvReadinessDay["readinessBucket"]
  ): HrvReadinessDay => ({
    memberId,
    handle: memberId,
    date,
    readinessBucket: bucket,
  });

  it("flags a day with 3+ very_low members", () => {
    const rows = [
      day("a", "2026-05-24", "very_low"),
      day("b", "2026-05-24", "very_low"),
      day("c", "2026-05-24", "very_low"),
      day("d", "2026-05-24", "low"), // not very_low → ignored
    ];
    const out = detectHrvClusterDays(rows, 27);
    expect(out.length).toBe(1);
    expect(out[0].code).toBe("hrv_cluster_day");
    expect(out[0].affectedMemberIds.sort()).toEqual(["a", "b", "c"]);
    expect(out[0].summaryDa).toContain("3 af 27");
  });

  it("does NOT flag a day with only 2 very_low members", () => {
    const rows = [
      day("a", "2026-05-24", "very_low"),
      day("b", "2026-05-24", "very_low"),
    ];
    expect(detectHrvClusterDays(rows, 27)).toEqual([]);
  });

  it("de-dupes a member with multiple very_low readings on one date", () => {
    const rows = [
      day("a", "2026-05-24", "very_low"),
      day("a", "2026-05-24", "very_low"),
      day("b", "2026-05-24", "very_low"),
    ];
    // 2 unique members → below threshold.
    expect(detectHrvClusterDays(rows, 27)).toEqual([]);
  });

  it("flags multiple cluster days, newest first", () => {
    const mk = (date: string) => [
      day("a", date, "very_low"),
      day("b", date, "very_low"),
      day("c", date, "very_low"),
    ];
    const rows = [...mk("2026-05-20"), ...mk("2026-05-24")];
    const out = detectHrvClusterDays(rows, 27);
    expect(out.length).toBe(2);
    expect(out[0].summaryDa).toContain("24");
    expect(out[1].summaryDa).toContain("20");
  });

  it("omits the 'af N' phrasing when cohortSize is 0", () => {
    const rows = [
      day("a", "2026-05-24", "very_low"),
      day("b", "2026-05-24", "very_low"),
      day("c", "2026-05-24", "very_low"),
    ];
    expect(detectHrvClusterDays(rows, 0)[0].summaryDa).not.toContain(" af ");
  });
});

// =====================================================================
// Detector 2 — rpe_drift_program_week
// =====================================================================

describe("detectRpeDriftProgramWeeks", () => {
  const r = (
    memberId: string,
    programCode: string,
    week: number,
    rpeDrift: number
  ): ProgramWeekRpe => ({ memberId, programCode, week, rpeDrift });

  it("flags a (program, week) group with median drift ≥1.5 and ≥2 members", () => {
    const rows = [
      r("a", "STR-12", 8, 1.6),
      r("b", "STR-12", 8, 1.4),
      r("c", "STR-12", 8, 2.0),
    ];
    // median(1.4, 1.6, 2.0) = 1.6 ≥ 1.5 → flag
    const out = detectRpeDriftProgramWeeks(rows);
    expect(out.length).toBe(1);
    expect(out[0].code).toBe("rpe_drift_program_week");
    expect(out[0].summaryDa).toContain("STR-12 uge 8");
    expect(out[0].summaryDa).toContain("+1.6");
    expect(out[0].affectedMemberIds.sort()).toEqual(["a", "b", "c"]);
  });

  it("does NOT flag when median is below 1.5", () => {
    const rows = [
      r("a", "STR-12", 8, 1.4),
      r("b", "STR-12", 8, 1.0),
    ];
    expect(detectRpeDriftProgramWeeks(rows)).toEqual([]);
  });

  it("does NOT flag a single-member group even with high drift", () => {
    expect(detectRpeDriftProgramWeeks([r("a", "STR-12", 8, 3.0)])).toEqual([]);
  });

  it("separates distinct (program, week) groups", () => {
    const rows = [
      r("a", "STR-12", 8, 2.0),
      r("b", "STR-12", 8, 2.0),
      r("c", "HYP-08", 3, 0.2),
      r("d", "HYP-08", 3, 0.1),
    ];
    const out = detectRpeDriftProgramWeeks(rows);
    expect(out.length).toBe(1);
    expect(out[0].summaryDa).toContain("STR-12 uge 8");
  });
});

// =====================================================================
// Detector 3 — engine_reject_streak
// =====================================================================

describe("detectEngineRejectStreaks", () => {
  const hist = (
    memberId: string,
    accepts: (boolean | null)[]
  ): MemberModifierHistory => ({
    memberId,
    handle: memberId,
    modifiers: accepts.map((acceptedByMember, i) => ({
      createdAt: `2026-05-${10 + i}`,
      acceptedByMember,
    })),
  });

  it("flags a member with 2 trailing kept-original in a row", () => {
    const out = detectEngineRejectStreaks([hist("a", [true, false, false])]);
    expect(out.length).toBe(1);
    expect(out[0].code).toBe("engine_reject_streak");
    expect(out[0].affectedMemberIds).toEqual(["a"]);
  });

  it("does NOT flag a single trailing reject", () => {
    expect(detectEngineRejectStreaks([hist("a", [false, true, false])])).toEqual(
      []
    );
  });

  it("requires the streak to be TRAILING (most recent)", () => {
    // Two rejects early, but most recent was accepted → no trailing streak.
    expect(
      detectEngineRejectStreaks([hist("a", [false, false, true])])
    ).toEqual([]);
  });

  it("aggregates multiple members into one pattern", () => {
    const out = detectEngineRejectStreaks([
      hist("a", [false, false]),
      hist("b", [true, true]),
      hist("c", [false, false, false]),
    ]);
    expect(out.length).toBe(1);
    expect(out[0].affectedMemberIds.sort()).toEqual(["a", "c"]);
    expect(out[0].summaryDa).toContain("2 medlemmer");
  });

  it("uses singular copy for one member", () => {
    const out = detectEngineRejectStreaks([hist("a", [false, false])]);
    expect(out[0].summaryDa).toContain("1 medlem har");
  });
});

// =====================================================================
// Detector 4 — form_check_decline
// =====================================================================

describe("detectFormCheckDeclines", () => {
  const hist = (
    memberId: string,
    scores: number[]
  ): MemberFormCheckHistory => ({
    memberId,
    handle: memberId,
    exerciseId: "ex-squat",
    exerciseName: "Back squat",
    scores: scores.map((score, i) => ({
      score,
      reviewedAt: `2026-05-${10 + i}`,
    })),
  });

  it("flags a >15% decline over the last 3 lifts", () => {
    // 8 → 6.5: drop = 1.5/8 = 18.75% > 15%
    const out = detectFormCheckDeclines([hist("a", [8, 7, 6.5])]);
    expect(out.length).toBe(1);
    expect(out[0].code).toBe("form_check_decline");
    expect(out[0].affectedMemberIds).toEqual(["a"]);
  });

  it("does NOT flag a decline at exactly 15% (needs strictly greater)", () => {
    // 8 → 6.8: drop = 1.2/8 = 15% exactly → not flagged
    expect(detectFormCheckDeclines([hist("a", [8, 7.4, 6.8])])).toEqual([]);
  });

  it("does NOT flag with fewer than 3 samples", () => {
    expect(detectFormCheckDeclines([hist("a", [8, 5])])).toEqual([]);
  });

  it("uses only the last 3 samples when more exist", () => {
    // Full: [4, 9, 9, 8.5]. Last 3: [9, 9, 8.5] → 5.5% drop, not flagged.
    expect(detectFormCheckDeclines([hist("a", [4, 9, 9, 8.5])])).toEqual([]);
  });

  it("ignores an improvement", () => {
    expect(detectFormCheckDeclines([hist("a", [6, 7, 8])])).toEqual([]);
  });

  it("aggregates multiple declining members", () => {
    const out = detectFormCheckDeclines([
      hist("a", [8, 7, 6]),
      hist("b", [9, 9, 9]),
      hist("c", [7, 6, 5]),
    ]);
    expect(out[0].affectedMemberIds.sort()).toEqual(["a", "c"]);
  });
});

// =====================================================================
// Orchestrator
// =====================================================================

describe("detectCohortPatterns", () => {
  it("concatenates all detectors in stable order", () => {
    const out = detectCohortPatterns({
      cohortSize: 10,
      hrvReadinessDays: [
        { memberId: "a", handle: "a", date: "2026-05-24", readinessBucket: "very_low" },
        { memberId: "b", handle: "b", date: "2026-05-24", readinessBucket: "very_low" },
        { memberId: "c", handle: "c", date: "2026-05-24", readinessBucket: "very_low" },
      ],
      programWeekRpe: [
        { memberId: "a", programCode: "STR-12", week: 8, rpeDrift: 2 },
        { memberId: "b", programCode: "STR-12", week: 8, rpeDrift: 2 },
      ],
      memberModifierHistories: [
        {
          memberId: "a",
          handle: "a",
          modifiers: [
            { createdAt: "1", acceptedByMember: false },
            { createdAt: "2", acceptedByMember: false },
          ],
        },
      ],
      memberFormCheckHistories: [
        {
          memberId: "a",
          handle: "a",
          exerciseId: "ex",
          exerciseName: "Squat",
          scores: [
            { score: 8, reviewedAt: "1" },
            { score: 7, reviewedAt: "2" },
            { score: 6, reviewedAt: "3" },
          ],
        },
      ],
    });
    expect(out.map((p) => p.code)).toEqual([
      "hrv_cluster_day",
      "rpe_drift_program_week",
      "engine_reject_streak",
      "form_check_decline",
    ]);
  });

  it("returns empty array when nothing qualifies", () => {
    expect(
      detectCohortPatterns({
        cohortSize: 10,
        hrvReadinessDays: [],
        programWeekRpe: [],
        memberModifierHistories: [],
        memberFormCheckHistories: [],
      })
    ).toEqual([]);
  });
});
