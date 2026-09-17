import { describe, expect, it } from "vitest";
import { MOTOR_STEPS, activeStepFrom } from "./motor-story";

describe("motor story", () => {
  it("tells the engine's order: sleep, hrv, stress, decision", () => {
    expect(MOTOR_STEPS.map((s) => s.key)).toEqual(["sleep", "hrv", "stress", "decision"]);
    expect(MOTOR_STEPS.map((s) => s.domain)).toEqual(["mind", "heart", "mind", "body"]);
  });

  it("shows the decision when nothing intersects (no-JS / reduced motion fallback)", () => {
    expect(activeStepFrom([])).toBe("decision");
  });

  it("picks the intersecting step closest to the viewport centre", () => {
    expect(
      activeStepFrom([
        { key: "hrv", distanceToCentre: 120 },
        { key: "stress", distanceToCentre: 40 },
      ]),
    ).toBe("stress");
  });
});
