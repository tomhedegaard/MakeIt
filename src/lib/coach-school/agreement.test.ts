import { describe, it, expect } from "vitest";
import {
  COACH_DECISIONS,
  computeAgreementScore,
  deriveMunkDecisionFromAlert,
  isCoachDecision,
  type CoachDecision,
} from "./agreement";

describe("computeAgreementScore", () => {
  it("returns 1.0 for every exact match", () => {
    for (const d of COACH_DECISIONS) {
      expect(computeAgreementScore(d, d)).toBe(1.0);
    }
  });

  it("is symmetric: score(a, b) === score(b, a)", () => {
    for (const a of COACH_DECISIONS) {
      for (const b of COACH_DECISIONS) {
        expect(computeAgreementScore(a, b)).toBe(computeAgreementScore(b, a));
      }
    }
  });

  it("scores adjacent decisions at 0.5", () => {
    expect(computeAgreementScore("approve", "modify")).toBe(0.5);
    expect(computeAgreementScore("modify", "escalate")).toBe(0.5);
  });

  it("scores one-step-off-the-ladder decisions at 0.25", () => {
    expect(computeAgreementScore("approve", "escalate")).toBe(0.25);
    expect(computeAgreementScore("escalate", "reject")).toBe(0.25);
  });

  it("scores reverse poles at 0.0", () => {
    expect(computeAgreementScore("approve", "reject")).toBe(0.0);
    expect(computeAgreementScore("modify", "reject")).toBe(0.0);
  });

  it("returns a value in [0, 1] for every pair", () => {
    for (const a of COACH_DECISIONS) {
      for (const b of COACH_DECISIONS) {
        const s = computeAgreementScore(a, b);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("deriveMunkDecisionFromAlert", () => {
  it("maps reviewed_noted to approve and reviewed_actioned to modify", () => {
    expect(deriveMunkDecisionFromAlert("reviewed_noted")).toBe("approve");
    expect(deriveMunkDecisionFromAlert("reviewed_actioned")).toBe("modify");
  });

  it("returns null for undecided / unknown statuses", () => {
    expect(deriveMunkDecisionFromAlert("open")).toBeNull();
    expect(deriveMunkDecisionFromAlert(null)).toBeNull();
    expect(deriveMunkDecisionFromAlert("dismissed")).toBeNull();
  });
});

describe("isCoachDecision", () => {
  it("accepts the four canonical decisions", () => {
    for (const d of COACH_DECISIONS) {
      expect(isCoachDecision(d)).toBe(true);
    }
  });

  it("rejects unknown strings", () => {
    expect(isCoachDecision("Approve")).toBe(false); // case-sensitive
    expect(isCoachDecision("")).toBe(false);
    expect(isCoachDecision("escalate-and-pause")).toBe(false);
  });

  it("narrows the type", () => {
    const s: string = "modify";
    if (isCoachDecision(s)) {
      const _typed: CoachDecision = s; // would be a type error if not narrowed
      expect(_typed).toBe("modify");
    } else {
      expect.fail("expected 'modify' to be a valid CoachDecision");
    }
  });
});
