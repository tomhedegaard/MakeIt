import { describe, it, expect } from "vitest";
import {
  evaluateNudge,
  nudgeCopy,
  NUDGE_HREF,
  type EvaluateNudgeInput,
} from "./nudge";

/** Build a fixture input — defaults are the "should nudge" state. */
function input(over: Partial<EvaluateNudgeInput> = {}): EvaluateNudgeInput {
  return {
    sessionSuggestionEnabled: true,
    hasActiveConnection: true,
    reading: {
      warmUpState: "active",
      readinessBucket: "low",
      measuredAt: new Date("2026-05-21T06:12:00Z").toISOString(),
    },
    now: new Date("2026-05-21T18:00:00Z"),
    ...over,
  };
}

describe("evaluateNudge", () => {
  it("returns { bucket: 'low' } when all conditions hold and bucket is low", () => {
    expect(evaluateNudge(input())).toEqual({ bucket: "low" });
  });

  it("returns { bucket: 'very_low' } when bucket is very_low", () => {
    expect(
      evaluateNudge(
        input({
          reading: {
            warmUpState: "active",
            readinessBucket: "very_low",
            measuredAt: new Date("2026-05-21T06:12:00Z").toISOString(),
          },
        }),
      ),
    ).toEqual({ bucket: "very_low" });
  });

  it("treats absent settings (null) as enabled (default-on)", () => {
    expect(evaluateNudge(input({ sessionSuggestionEnabled: null }))).toEqual({
      bucket: "low",
    });
  });

  it("returns null when the member has silenced the toggle", () => {
    expect(evaluateNudge(input({ sessionSuggestionEnabled: false }))).toBeNull();
  });

  it("returns null when the reading is older than 36 hours", () => {
    expect(
      evaluateNudge(
        input({
          reading: {
            warmUpState: "active",
            readinessBucket: "low",
            measuredAt: new Date("2026-05-19T06:00:00Z").toISOString(),
          },
        }),
      ),
    ).toBeNull();
  });

  it("returns null for normal-readiness days", () => {
    expect(
      evaluateNudge(
        input({
          reading: {
            warmUpState: "active",
            readinessBucket: "normal",
            measuredAt: new Date("2026-05-21T06:12:00Z").toISOString(),
          },
        }),
      ),
    ).toBeNull();
  });

  it("returns null in warming-up (provisional) state — bucket is null then", () => {
    expect(
      evaluateNudge(
        input({
          reading: {
            warmUpState: "provisional",
            readinessBucket: null,
            measuredAt: new Date("2026-05-21T06:12:00Z").toISOString(),
          },
        }),
      ),
    ).toBeNull();
  });

  it("returns null when no wearable is connected", () => {
    expect(evaluateNudge(input({ hasActiveConnection: false }))).toBeNull();
  });

  it("returns null when there are no readings at all", () => {
    expect(evaluateNudge(input({ reading: null }))).toBeNull();
  });
});

describe("nudgeCopy", () => {
  it("uses the low eyebrow for bucket=low", () => {
    expect(nudgeCopy("low").eyebrow).toBe("HRV LAV I DAG");
  });

  it("uses the very-low eyebrow for bucket=very_low", () => {
    expect(nudgeCopy("very_low").eyebrow).toBe("HRV MEGET LAV I DAG");
  });

  it("emits non-empty Danish body copy for both buckets", () => {
    expect(nudgeCopy("low").body).toContain("normalområde");
    expect(nudgeCopy("very_low").body).toContain("normalområde");
    expect(nudgeCopy("low").body).not.toBe(nudgeCopy("very_low").body);
  });
});

describe("NUDGE_HREF", () => {
  it("points at the HRV module (regression guard if the route moves)", () => {
    expect(NUDGE_HREF).toBe("/hrv");
  });
});
