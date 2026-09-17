/** The four morning-report lines, in the order the engine reads them (spec §4 A1). */
export const MOTOR_STEPS = [
  { key: "sleep", domain: "mind" },
  { key: "hrv", domain: "heart" },
  { key: "stress", domain: "mind" },
  { key: "decision", domain: "body" },
] as const;

export type MotorStepKey = (typeof MOTOR_STEPS)[number]["key"];

/**
 * Which phone state to show. With nothing intersecting (no JS,
 * reduced motion, first paint) the rig shows the decision, which is
 * the point of the story.
 */
export function activeStepFrom(
  visible: { key: MotorStepKey; distanceToCentre: number }[],
): MotorStepKey {
  if (visible.length === 0) return "decision";
  return [...visible].sort((a, b) => a.distanceToCentre - b.distanceToCentre)[0].key;
}

/** Phone states screen readers should skip: on desktop only the active one is shown. */
export function hiddenStates(active: MotorStepKey, isDesktop: boolean): MotorStepKey[] {
  return isDesktop ? MOTOR_STEPS.map((s) => s.key).filter((key) => key !== active) : [];
}
