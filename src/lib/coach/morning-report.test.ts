/**
 * Unit tests for the morning-report pure builder (MM-2).
 *
 * Covers payload shaping (camelCase → snake_case, sorting, clamping),
 * urgency classification (the quiet/attention/urgent matrix), and the
 * Danish headline copy including pluralisation + the honest
 * quiet-morning line.
 */

import { describe, expect, it } from "vitest";

import {
  assessMorningUrgency,
  buildMorningHeadline,
  buildMorningReportPayload,
} from "./morning-report";
import type { CohortPattern, MorningReportInputs } from "./types";

function baseInputs(
  overrides: Partial<MorningReportInputs> = {}
): MorningReportInputs {
  return {
    sustainedLowHrvMembers: [],
    openAdaptiveEscalations: 0,
    pendingFormChecks: { count: 0, avgWaitHours: 0 },
    patterns: [],
    yesterday: {
      sessionsCompleted: 0,
      sessionsSkipped: 0,
      prsNoted: 0,
      formChecksUploaded: 0,
      adaptiveModifiers: 0,
      adaptiveAccepted: 0,
    },
    ...overrides,
  };
}

const pattern = (overrides: Partial<CohortPattern> = {}): CohortPattern => ({
  code: "hrv_cluster_day",
  summaryDa: "4 af 27 ramte very_low tirsdag.",
  affectedMemberIds: ["a", "b", "c", "d"],
  ...overrides,
});

// =====================================================================
// buildMorningReportPayload
// =====================================================================

describe("buildMorningReportPayload — shaping", () => {
  it("maps camelCase inputs to snake_case payload", () => {
    const payload = buildMorningReportPayload(
      baseInputs({
        pendingFormChecks: { count: 4, avgWaitHours: 6.2 },
        yesterday: {
          sessionsCompleted: 18,
          sessionsSkipped: 2,
          prsNoted: 7,
          formChecksUploaded: 1,
          adaptiveModifiers: 5,
          adaptiveAccepted: 4,
        },
      })
    );
    expect(payload.urgent.pending_form_checks).toEqual({
      count: 4,
      avg_wait_hours: 6.2,
    });
    expect(payload.yesterday).toEqual({
      sessions_completed: 18,
      sessions_skipped: 2,
      prs_noted: 7,
      form_checks_uploaded: 1,
      adaptive_modifiers: 5,
      adaptive_accepted: 4,
    });
  });

  it("sorts sustained-low members by days_low descending", () => {
    const payload = buildMorningReportPayload(
      baseInputs({
        sustainedLowHrvMembers: [
          { memberId: "a", handle: "alpha", daysLow: 3 },
          { memberId: "b", handle: "beta", daysLow: 7 },
          { memberId: "c", handle: "gamma", daysLow: 5 },
        ],
      })
    );
    expect(
      payload.urgent.sustained_low_hrv_members.map((m) => m.handle)
    ).toEqual(["beta", "gamma", "alpha"]);
  });

  it("caps the sustained-low list at 8 members", () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      memberId: `m${i}`,
      handle: `member${i}`,
      daysLow: i,
    }));
    const payload = buildMorningReportPayload(
      baseInputs({ sustainedLowHrvMembers: many })
    );
    expect(payload.urgent.sustained_low_hrv_members.length).toBe(8);
    // Highest days_low first → member14 down to member7.
    expect(payload.urgent.sustained_low_hrv_members[0].handle).toBe("member14");
  });

  it("clamps negative / non-finite counters to 0", () => {
    const payload = buildMorningReportPayload(
      baseInputs({
        openAdaptiveEscalations: -3,
        pendingFormChecks: { count: -1, avgWaitHours: -5 },
        yesterday: {
          sessionsCompleted: -2,
          sessionsSkipped: NaN,
          prsNoted: Infinity,
          formChecksUploaded: -10,
          adaptiveModifiers: -1,
          adaptiveAccepted: -1,
        },
      })
    );
    expect(payload.urgent.open_adaptive_escalations).toBe(0);
    expect(payload.urgent.pending_form_checks).toEqual({
      count: 0,
      avg_wait_hours: 0,
    });
    expect(payload.yesterday.sessions_completed).toBe(0);
    expect(payload.yesterday.sessions_skipped).toBe(0);
    expect(payload.yesterday.prs_noted).toBe(0);
  });

  it("rounds avg_wait_hours to one decimal", () => {
    const payload = buildMorningReportPayload(
      baseInputs({ pendingFormChecks: { count: 3, avgWaitHours: 6.27 } })
    );
    expect(payload.urgent.pending_form_checks.avg_wait_hours).toBe(6.3);
  });

  it("maps patterns to snake_case", () => {
    const payload = buildMorningReportPayload(
      baseInputs({
        patterns: [
          pattern({
            code: "rpe_drift_program_week",
            summaryDa: "STR-12 uge 8: RPE-drift over hele kohorten.",
            affectedMemberIds: ["x", "y"],
          }),
        ],
      })
    );
    expect(payload.patterns).toEqual([
      {
        code: "rpe_drift_program_week",
        summary_da: "STR-12 uge 8: RPE-drift over hele kohorten.",
        affected_member_ids: ["x", "y"],
      },
    ]);
  });
});

// =====================================================================
// assessMorningUrgency
// =====================================================================

describe("assessMorningUrgency", () => {
  it("quiet when only the routine form-check queue is non-empty", () => {
    const payload = buildMorningReportPayload(
      baseInputs({ pendingFormChecks: { count: 4, avgWaitHours: 6 } })
    );
    expect(assessMorningUrgency(payload)).toBe("quiet");
  });

  it("attention when patterns exist but no urgent items", () => {
    const payload = buildMorningReportPayload(
      baseInputs({ patterns: [pattern()] })
    );
    expect(assessMorningUrgency(payload)).toBe("attention");
  });

  it("urgent when a sustained-low member exists", () => {
    const payload = buildMorningReportPayload(
      baseInputs({
        sustainedLowHrvMembers: [
          { memberId: "a", handle: "alpha", daysLow: 4 },
        ],
        patterns: [pattern()],
      })
    );
    expect(assessMorningUrgency(payload)).toBe("urgent");
  });

  it("urgent when an open escalation exists", () => {
    const payload = buildMorningReportPayload(
      baseInputs({ openAdaptiveEscalations: 2 })
    );
    expect(assessMorningUrgency(payload)).toBe("urgent");
  });
});

// =====================================================================
// buildMorningHeadline
// =====================================================================

describe("buildMorningHeadline — quiet", () => {
  it("empty queue → nyd kaffen", () => {
    const payload = buildMorningReportPayload(baseInputs());
    expect(buildMorningHeadline(payload)).toBe(
      "Stille morgen. Tom kø — ingen røde flag. Nyd kaffen."
    );
  });

  it("singular form-check", () => {
    const payload = buildMorningReportPayload(
      baseInputs({ pendingFormChecks: { count: 1, avgWaitHours: 2 } })
    );
    expect(buildMorningHeadline(payload)).toBe(
      "Stille morgen. 1 form-check i kø — ingen røde flag. Nyd kaffen."
    );
  });

  it("plural form-checks", () => {
    const payload = buildMorningReportPayload(
      baseInputs({ pendingFormChecks: { count: 4, avgWaitHours: 6 } })
    );
    expect(buildMorningHeadline(payload)).toBe(
      "Stille morgen. 4 form-checks i kø — ingen røde flag. Nyd kaffen."
    );
  });
});

describe("buildMorningHeadline — attention", () => {
  it("singular pattern", () => {
    const payload = buildMorningReportPayload(
      baseInputs({ patterns: [pattern()] })
    );
    expect(buildMorningHeadline(payload)).toBe(
      "1 mønster på tværs at kigge på i dag."
    );
  });

  it("plural patterns", () => {
    const payload = buildMorningReportPayload(
      baseInputs({ patterns: [pattern(), pattern({ code: "engine_reject_streak" })] })
    );
    expect(buildMorningHeadline(payload)).toBe(
      "2 mønstre på tværs at kigge på i dag."
    );
  });
});

describe("buildMorningHeadline — urgent", () => {
  it("only sustained-low members (singular)", () => {
    const payload = buildMorningReportPayload(
      baseInputs({
        sustainedLowHrvMembers: [{ memberId: "a", handle: "x", daysLow: 4 }],
      })
    );
    expect(buildMorningHeadline(payload)).toBe(
      "Kræver dig nu: 1 medlem med vedvarende lav HRV."
    );
  });

  it("only escalations (plural)", () => {
    const payload = buildMorningReportPayload(
      baseInputs({ openAdaptiveEscalations: 3 })
    );
    expect(buildMorningHeadline(payload)).toBe(
      "Kræver dig nu: 3 eskaleringer fra motoren."
    );
  });

  it("both buckets combined with a separator", () => {
    const payload = buildMorningReportPayload(
      baseInputs({
        sustainedLowHrvMembers: [
          { memberId: "a", handle: "x", daysLow: 5 },
          { memberId: "b", handle: "y", daysLow: 4 },
        ],
        openAdaptiveEscalations: 1,
      })
    );
    expect(buildMorningHeadline(payload)).toBe(
      "Kræver dig nu: 2 medlemmer med vedvarende lav HRV · 1 eskalering fra motoren."
    );
  });
});
