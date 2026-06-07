import { describe, expect, it } from "vitest";
import {
  applyMentalAdjustment,
  decorateDecisionWithMentalReason,
  isMentalSignalFresh,
  isMentalSignalLow,
  mentalAwareEngineInput,
  mentalReasonNarrative,
} from "./snapshot-contribution";
import type { MentalSignal } from "./types";
import type { CandidateDecision, EngineInput } from "@/lib/adaptive/types";

function baseInput(): EngineInput {
  return {
    memberId: "m1",
    adaptiveProgramEnabled: true,
    latestReading: {
      measuredAt: "2026-06-07T06:00:00Z",
      warmUpState: "active",
      readinessBucket: "normal",
      isSick: false,
    },
    veryLowDaysLast5: 0,
    rpeDriftLast14d: null,
    lifestyle: { sleepHoursAvg2d: null, alcoholLast2d: false, feelingLast3d: null },
    recentSessions: [],
    recentFormChecks: [],
    daysSinceHeavyLift: null,
    nextSession: null,
    now: new Date("2026-06-07T07:00:00Z"),
  };
}

const fresh = (overrides: Partial<MentalSignal> = {}): MentalSignal => ({
  energy_median_7d: 3,
  stress_median_7d: 3,
  focus_median_7d: 3,
  low_for_days: 0,
  freshness_days: 0,
  ...overrides,
});

describe("isMentalSignalFresh", () => {
  it("null returns false", () => {
    expect(isMentalSignalFresh(null)).toBe(false);
  });
  it("freshness <= 3 is fresh", () => {
    expect(isMentalSignalFresh(fresh({ freshness_days: 3 }))).toBe(true);
  });
  it("freshness > 3 is stale", () => {
    expect(isMentalSignalFresh(fresh({ freshness_days: 4 }))).toBe(false);
  });
});

describe("isMentalSignalLow", () => {
  it("low_for_days < 3 not low", () => {
    expect(isMentalSignalLow(fresh({ low_for_days: 2 }))).toBe(false);
  });
  it("low_for_days >= 3 is low", () => {
    expect(isMentalSignalLow(fresh({ low_for_days: 3 }))).toBe(true);
  });
});

describe("applyMentalAdjustment", () => {
  it("no signal: bucket unchanged", () => {
    expect(applyMentalAdjustment("normal", null)).toEqual({
      bucket: "normal",
      mentalFired: false,
    });
  });
  it("fresh + low_for_days >= 3 drops normal to low", () => {
    expect(
      applyMentalAdjustment("normal", fresh({ low_for_days: 4 })),
    ).toEqual({ bucket: "low", mentalFired: true });
  });
  it("fresh + low_for_days >= 3 drops high to normal", () => {
    expect(
      applyMentalAdjustment("high", fresh({ low_for_days: 4 })),
    ).toEqual({ bucket: "normal", mentalFired: true });
  });
  it("fresh + low_for_days >= 3 drops very_high to high", () => {
    expect(
      applyMentalAdjustment("very_high", fresh({ low_for_days: 4 })),
    ).toEqual({ bucket: "high", mentalFired: true });
  });
  it("fresh + low_for_days >= 3 drops low to very_low", () => {
    expect(
      applyMentalAdjustment("low", fresh({ low_for_days: 5 })),
    ).toEqual({ bucket: "very_low", mentalFired: true });
  });
  it("fresh + very_low holds at very_low", () => {
    const r = applyMentalAdjustment("very_low", fresh({ low_for_days: 5 }));
    expect(r.bucket).toBe("very_low");
  });
  it("stale signal: bucket unchanged even if low", () => {
    expect(
      applyMentalAdjustment("normal", fresh({ low_for_days: 5, freshness_days: 7 })),
    ).toEqual({ bucket: "normal", mentalFired: false });
  });
  it("low_for_days < 3: bucket unchanged", () => {
    expect(
      applyMentalAdjustment("normal", fresh({ low_for_days: 2 })),
    ).toEqual({ bucket: "normal", mentalFired: false });
  });
  it("null bucket: returns null", () => {
    expect(
      applyMentalAdjustment(null, fresh({ low_for_days: 5 })),
    ).toEqual({ bucket: null, mentalFired: false });
  });
});

describe("mentalAwareEngineInput", () => {
  it("returns same input when signal is null", () => {
    const inp = baseInput();
    expect(mentalAwareEngineInput(inp, null)).toBe(inp);
  });
  it("returns same input when bucket already very_low → no-op", () => {
    const inp: EngineInput = {
      ...baseInput(),
      latestReading: {
        ...baseInput().latestReading!,
        readinessBucket: "very_low",
      },
    };
    const out = mentalAwareEngineInput(inp, fresh({ low_for_days: 5 }));
    expect(out.latestReading?.readinessBucket).toBe("very_low");
  });
  it("downgrades normal to low when mental signal low", () => {
    const inp = baseInput();
    const out = mentalAwareEngineInput(inp, fresh({ low_for_days: 4 }));
    expect(out.latestReading?.readinessBucket).toBe("low");
    expect(out).not.toBe(inp);
  });
  it("leaves bucket alone when signal stale", () => {
    const inp = baseInput();
    const out = mentalAwareEngineInput(
      inp,
      fresh({ low_for_days: 5, freshness_days: 10 }),
    );
    expect(out).toBe(inp);
  });
});

describe("decorateDecisionWithMentalReason", () => {
  const decision: CandidateDecision = {
    action: "top_set_reduction",
    confidence: 0.7,
    reasons: ["hrv_low"],
    params: { percent: 10 },
    humanReviewRecommended: false,
    explanationDa: "test",
  };
  it("appends mental reason when signal fresh + low", () => {
    const out = decorateDecisionWithMentalReason(decision, fresh({ low_for_days: 4 }));
    expect(out.reasons).toContain("mental_state_low_energy_or_high_stress");
  });
  it("does not append when no_change action", () => {
    const noop: CandidateDecision = { ...decision, action: "no_change" };
    const out = decorateDecisionWithMentalReason(noop, fresh({ low_for_days: 4 }));
    expect(out.reasons).not.toContain("mental_state_low_energy_or_high_stress");
  });
  it("does not double-append if already present", () => {
    const withMental: CandidateDecision = {
      ...decision,
      reasons: ["hrv_low", "mental_state_low_energy_or_high_stress"],
    };
    const out = decorateDecisionWithMentalReason(withMental, fresh({ low_for_days: 4 }));
    expect(out.reasons.filter((r) => r === "mental_state_low_energy_or_high_stress").length).toBe(1);
  });
});

describe("mentalReasonNarrative", () => {
  it("mentions days and medians when present", () => {
    const txt = mentalReasonNarrative(
      fresh({ low_for_days: 4, energy_median_7d: 2, stress_median_7d: 4 }),
    );
    expect(txt).toMatch(/4 dage/);
    expect(txt).toMatch(/2\/5/);
    expect(txt).toMatch(/4\/5/);
  });
  it("falls back to days-only narrative when medians are null", () => {
    const txt = mentalReasonNarrative(
      fresh({
        low_for_days: 3,
        energy_median_7d: null,
        stress_median_7d: null,
      }),
    );
    expect(txt).toMatch(/3 dage/);
  });
});
