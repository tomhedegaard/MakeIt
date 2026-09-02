/**
 * Landing-loop Beat A numbers — locked to the public explainer
 * scenario so the Program proof cannot drift from the rule engine.
 *
 * 150 kg × 10% top_set_reduction snaps to 135 (same 2.5 kg rule as
 * applyAdaptationToSession). If the engine stops firing that action
 * at 10%, loop-proof.test.ts fails and the frame must be rewritten.
 */

import { explainerScenarioDecision } from "@/lib/adaptive/mock-scenarios";

export const PROGRAM_PROOF = {
  action: "top_set_reduction" as const,
  percent: 10,
  beforeKg: 150,
  afterKg: 135,
};

export function programProofMatchesEngine(): boolean {
  const decision = explainerScenarioDecision();
  return (
    decision.action === PROGRAM_PROOF.action &&
    decision.params.percent === PROGRAM_PROOF.percent
  );
}
