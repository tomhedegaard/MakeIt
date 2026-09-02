import { describe, expect, it } from "vitest";

import { explainerScenarioDecision } from "@/lib/adaptive/mock-scenarios";
import {
  PROGRAM_PROOF,
  programProofMatchesEngine,
} from "./loop-proof";

describe("program landing proof", () => {
  it("tracks the explainer scenario's top_set_reduction at 10%", () => {
    const decision = explainerScenarioDecision();
    expect(decision.action).toBe("top_set_reduction");
    expect(decision.params.percent).toBe(10);
    expect(PROGRAM_PROOF.afterKg).toBe(
      PROGRAM_PROOF.beforeKg * (1 - PROGRAM_PROOF.percent / 100),
    );
    expect(programProofMatchesEngine()).toBe(true);
  });
});
