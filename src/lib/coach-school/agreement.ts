/**
 * Crew Coaching Pyramid — sandbox agreement scoring (CC-4).
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §7
 *
 * Pure: no DB, no React. Compares a sandbox Beast's parallel decision
 * against Munk's actual decision on the same hrv_alert and returns a
 * 0..1 score. The rolling mean of the last 50 scores drives the
 * promotion gate (CC-7's /coach/co-coaches view, threshold = 0.80).
 *
 * Scoring matrix — symmetric, monotonic from "calm" (approve) to
 * "escalate-up" (escalate) to "reject":
 *
 *                    approve  modify  escalate  reject
 *   approve   |       1.0      0.5     0.25      0.0
 *   modify    |       0.5      1.0     0.5       0.0
 *   escalate  |       0.25     0.5     1.0       0.25
 *   reject    |       0.0      0.0     0.25      1.0
 *
 * Rationale:
 *   - Exact match → 1.0 (the Beast saw it the same way).
 *   - Adjacent on the action-intensity ladder → 0.5 (close enough; one
 *     was a little more / a little less assertive).
 *   - Skipping a rung (approve↔escalate, escalate↔reject) → 0.25.
 *   - Reverse poles (approve/modify ↔ reject) → 0.0 (the Beast got it
 *     fundamentally wrong relative to Munk).
 */

export type CoachDecision = "approve" | "modify" | "escalate" | "reject";

const SCORE: Record<CoachDecision, Record<CoachDecision, number>> = {
  approve:  { approve: 1.0,  modify: 0.5,  escalate: 0.25, reject: 0.0 },
  modify:   { approve: 0.5,  modify: 1.0,  escalate: 0.5,  reject: 0.0 },
  escalate: { approve: 0.25, modify: 0.5,  escalate: 1.0,  reject: 0.25 },
  reject:   { approve: 0.0,  modify: 0.0,  escalate: 0.25, reject: 1.0 },
};

export const COACH_DECISIONS: readonly CoachDecision[] = [
  "approve",
  "modify",
  "escalate",
  "reject",
];

export function isCoachDecision(s: string): s is CoachDecision {
  return (COACH_DECISIONS as readonly string[]).includes(s);
}

/** Symmetric 0..1 agreement score. */
export function computeAgreementScore(
  beast: CoachDecision,
  munk: CoachDecision,
): number {
  return SCORE[beast][munk];
}

/**
 * Derive Munk's effective decision from an hrv_alerts.status string.
 *
 * v0 mapping (documented simplification — the alert status is the
 * only signal that survives Munk's review in the current schema):
 *   - reviewed_noted    → 'approve'  (Munk saw it, no action needed)
 *   - reviewed_actioned → 'modify'   (Munk did something — note,
 *                                     pause-session, or adaptive sign-off)
 *   - anything else (incl. 'open')   → null (not a decided sandbox case)
 *
 * A future refinement will split 'modify' vs 'escalate' by joining
 * hrv_session_modifiers / hrv_alerts.session_modifier_id to detect
 * "Munk escalated this alert into a deload or pause" specifically.
 * For v0 the binary approve/modify split is honest about what we
 * actually capture.
 */
export function deriveMunkDecisionFromAlert(
  status: string | null,
): CoachDecision | null {
  if (status === "reviewed_actioned") return "modify";
  if (status === "reviewed_noted") return "approve";
  return null;
}
