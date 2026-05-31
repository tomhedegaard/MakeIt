/**
 * Verifies the explainer scenario actually triggers what its display
 * copy claims. If someone changes the rule layer in a way that
 * affects the scenario's outcome, this test fails and forces a
 * decision: update the scenario, the rule, or both.
 */

import { describe, expect, it } from "vitest";

import { evaluateAdaptation } from "./engine";
import {
  EXPLAINER_REASONING_OUTPUT,
  explainerScenarioDecision,
  explainerScenarioInput,
} from "./mock-scenarios";

describe("explainer scenario", () => {
  it("triggers top_set_reduction with hrv_low + low_sleep + low_feeling", () => {
    const decision = evaluateAdaptation(explainerScenarioInput());
    expect(decision.action).toBe("top_set_reduction");
    expect(decision.reasons).toContain("hrv_low");
    expect(decision.reasons).toContain("low_sleep");
    expect(decision.reasons).toContain("low_feeling");
    expect(decision.params.percent).toBe(10);
  });

  it("explainerScenarioDecision matches evaluateAdaptation", () => {
    expect(explainerScenarioDecision()).toEqual(
      evaluateAdaptation(explainerScenarioInput())
    );
  });

  it("mock Claude refinement uses a valid AdaptiveAction", () => {
    expect(EXPLAINER_REASONING_OUTPUT.finalAction).toBe("top_set_reduction");
    expect(EXPLAINER_REASONING_OUTPUT.confidence).toBeGreaterThan(0);
    expect(EXPLAINER_REASONING_OUTPUT.confidence).toBeLessThanOrEqual(1);
  });

  it("scenario carries warmUpState=active + readinessBucket=low so the engine doesn't hard-exit", () => {
    const input = explainerScenarioInput();
    expect(input.latestReading?.warmUpState).toBe("active");
    expect(input.latestReading?.readinessBucket).toBe("low");
    expect(input.adaptiveProgramEnabled).toBe(true);
    expect(input.nextSession).not.toBeNull();
  });
});
