/**
 * Unit tests for the history-narratives helpers.
 *
 * Coverage focuses on the state matrix of describeAdaptationOutcome
 * (every (reviewedBy, acceptedByMember) combination has explicit
 * expectations) + edge cases for the formatters.
 */

import { describe, expect, it } from "vitest";

import {
  describeAdaptationOutcome,
  formatHistoryDate,
  formatHistoryRpeDelta,
  formatNextDayReadiness,
} from "./history-narratives";

// =====================================================================
// describeAdaptationOutcome — state matrix
// =====================================================================

describe("describeAdaptationOutcome — Munk-reviewed", () => {
  it("munk + member kept original → dim ✗ Munk afviste", () => {
    expect(
      describeAdaptationOutcome({
        acceptedByMember: false,
        reviewedBy: "munk",
      })
    ).toEqual({ icon: "✗", label: "Munk afviste", tone: "dim" });
  });

  it("munk + accepted true → quiet ✓ Munk godkendte", () => {
    expect(
      describeAdaptationOutcome({
        acceptedByMember: true,
        reviewedBy: "munk",
      })
    ).toEqual({ icon: "✓", label: "Munk godkendte", tone: "quiet" });
  });

  it("munk + accepted null (escalation, no member choice) → quiet ✓", () => {
    expect(
      describeAdaptationOutcome({
        acceptedByMember: null,
        reviewedBy: "munk",
      })
    ).toEqual({ icon: "✓", label: "Munk godkendte", tone: "quiet" });
  });
});

describe("describeAdaptationOutcome — co-coach-reviewed", () => {
  it("co_coach:<id> + accepted → quiet ✓ Coach godkendte", () => {
    expect(
      describeAdaptationOutcome({
        acceptedByMember: true,
        reviewedBy: "co_coach:abc-123",
      })
    ).toEqual({ icon: "✓", label: "Coach godkendte", tone: "quiet" });
  });

  it("co_coach + rejected → dim ✗ Coach afviste", () => {
    expect(
      describeAdaptationOutcome({
        acceptedByMember: false,
        reviewedBy: "co_coach:abc-123",
      })
    ).toEqual({ icon: "✗", label: "Coach afviste", tone: "dim" });
  });
});

describe("describeAdaptationOutcome — auto-signed", () => {
  it("auto + accepted true → quiet ✓ Accepteret", () => {
    expect(
      describeAdaptationOutcome({
        acceptedByMember: true,
        reviewedBy: "auto",
      })
    ).toEqual({ icon: "✓", label: "Accepteret", tone: "quiet" });
  });

  it("auto + accepted null (member hasn't responded) → quiet ✓", () => {
    // We treat 'no response yet' as accepted-by-default — the engine
    // already applied the change on the next render, member didn't
    // opt out.
    expect(
      describeAdaptationOutcome({
        acceptedByMember: null,
        reviewedBy: "auto",
      })
    ).toEqual({ icon: "✓", label: "Accepteret", tone: "quiet" });
  });

  it("auto + accepted false → dim ✗ Behold original", () => {
    expect(
      describeAdaptationOutcome({
        acceptedByMember: false,
        reviewedBy: "auto",
      })
    ).toEqual({ icon: "✗", label: "Behold original", tone: "dim" });
  });
});

describe("describeAdaptationOutcome — escalation pending", () => {
  it("null reviewedBy + null accepted → pending · Afventer review", () => {
    expect(
      describeAdaptationOutcome({
        acceptedByMember: null,
        reviewedBy: null,
      })
    ).toEqual({ icon: "·", label: "Afventer review", tone: "pending" });
  });
});

// =====================================================================
// formatHistoryRpeDelta
// =====================================================================

describe("formatHistoryRpeDelta", () => {
  it("formats positive delta with + sign", () => {
    expect(formatHistoryRpeDelta(0.3)).toBe("RPE-delta +0.3");
    expect(formatHistoryRpeDelta(1.5)).toBe("RPE-delta +1.5");
  });

  it("formats negative delta with unicode minus", () => {
    expect(formatHistoryRpeDelta(-0.5)).toBe("RPE-delta −0.5");
    expect(formatHistoryRpeDelta(-2.1)).toBe("RPE-delta −2.1");
  });

  it("formats exact zero with ±", () => {
    expect(formatHistoryRpeDelta(0)).toBe("RPE-delta ±0.0");
  });

  it("returns null for missing or non-finite values", () => {
    expect(formatHistoryRpeDelta(null)).toBeNull();
    expect(formatHistoryRpeDelta(NaN)).toBeNull();
    expect(formatHistoryRpeDelta(Infinity)).toBeNull();
  });
});

// =====================================================================
// formatNextDayReadiness
// =====================================================================

describe("formatNextDayReadiness", () => {
  it("formats each readiness bucket", () => {
    expect(formatNextDayReadiness("very_low")).toBe(
      "Næste dags HRV: meget lav"
    );
    expect(formatNextDayReadiness("low")).toBe("Næste dags HRV: lav");
    expect(formatNextDayReadiness("normal")).toBe("Næste dags HRV: normal");
    expect(formatNextDayReadiness("high")).toBe("Næste dags HRV: høj");
    expect(formatNextDayReadiness("very_high")).toBe(
      "Næste dags HRV: meget høj"
    );
  });

  it("returns null when bucket is null", () => {
    expect(formatNextDayReadiness(null)).toBeNull();
  });
});

// =====================================================================
// formatHistoryDate
// =====================================================================

describe("formatHistoryDate", () => {
  it("formats ISO timestamps as Danish short date", () => {
    // Note: locale output includes a period after the day on some
    // platforms ("24. maj"); we accept the day + month substring.
    const out = formatHistoryDate("2026-05-24T10:00:00.000Z");
    expect(out).toMatch(/24/);
    expect(out.toLowerCase()).toMatch(/maj/);
  });

  it("returns em-dash for invalid input", () => {
    expect(formatHistoryDate("not a date")).toBe("—");
  });
});
