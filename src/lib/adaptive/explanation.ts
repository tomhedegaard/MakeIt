/**
 * Adaptive Program Engine — member-facing display helpers.
 *
 * Spec: docs/superpowers/specs/2026-05-25-adaptive-program-engine-v0-design.md §6
 *
 * Pure functions that turn a persisted hrv_session_modifiers row into
 * the labels and state flags the UI card needs. No DB, no React.
 * The `explanationDa` string is rendered verbatim — it was already
 * formatted by either the rule-layer fallback or the Claude reasoning
 * layer, in Munk's voice.
 *
 * Three signals drive the card's tone:
 *   - modifierType: shapes the eyebrow (what kind of change happened)
 *   - reviewedBy: shapes the attribution + pending state
 *   - acceptedByMember: shapes the accept/dismiss CTA
 */

import type { AdaptiveAction } from "./types";

/** Pre-shaped view-model for `AdaptationCard.tsx`. */
export interface AdaptationDisplay {
  /** Short label above the body. Same role as nudge's eyebrow. */
  eyebrow: string;
  /** Attribution line ("Tilpasset af Munk" / "Automatisk" / "Coach gennemgår"). */
  attribution: string;
  /** True if the engine modifier is queued for human review and not yet seen. */
  pendingCoach: boolean;
  /**
   * True if member should see the accept/keep-original CTA pair. False
   * for actions that have no member choice (paused_session, escalations).
   */
  showAcceptCTA: boolean;
}

/**
 * The shape `getActiveAdaptationForSession` returns. Kept here so both
 * the data layer and the component refer to one canonical type.
 *
 * `params` is the deserialised `hrv_session_modifiers.applied_value`
 * jsonb — shape depends on `modifierType`. The apply layer
 * (`src/lib/adaptive/apply.ts`) narrows per action.
 *
 * The five `reasoning*` fields below are populated for Open Brain UI
 * v0 (Søjle 2). They are all optional so:
 *   - Demo mode + older rows can render the basic card unchanged
 *   - Tests and consumers that only need the v1 fields aren't
 *     required to provide reasoning context
 *   - AdaptationCard guards on their presence before mounting the
 *     "Vis tankegang" disclosure
 */
export interface ActiveAdaptation {
  modifierId: string;
  modifierType: AdaptiveAction;
  explanationDa: string;
  reviewedBy: string | null;
  acceptedByMember: boolean | null;
  params: Record<string, unknown>;
  // ---- Open Brain UI v0 reasoning context (optional) ----
  /** Raw input_snapshot jsonb. Hydrated via snapshot.ts when present. */
  inputSnapshot?: unknown;
  /** Narrowed rule_decision blob. Drives "Hvilken regel fyrede" subpanel. */
  ruleDecision?: {
    action: AdaptiveAction;
    reasons: string[];
    confidence: number;
    params: Record<string, unknown>;
  };
  /**
   * Narrowed reasoning_output blob from the Claude reasoning layer.
   * Null when the rule layer signed off alone (no API call); undefined
   * when the data layer didn't fetch it (older row / demo mode).
   */
  reasoningOutput?: {
    finalAction: AdaptiveAction;
    confidence: number;
  } | null;
  /** Telemetry: first time member expanded "Vis tankegang". Null = never. */
  reasoningRevealedAt?: string | null;
  /** Modifier row's created_at — used as `now` when hydrating the snapshot. */
  createdAt?: string;
  /** Count helper for "Hvad motoren så" (form-checks array is dropped from snapshot). */
  recentFormCheckCount?: number;
}

/**
 * Build display labels for the active adaptation. Pure.
 *
 * Tone choices:
 *   - "Dagens session er tilpasset" for normal automatic actions
 *   - "Coach gennemgår dagens session" for escalations awaiting Munk
 *   - "Dagens session er på pause" for paused_session
 *   - "Munks anbefaling: deload-uge" for deload_week_insertion
 */
export function describeAdaptation(
  modifier: Pick<ActiveAdaptation, "modifierType" | "reviewedBy" | "acceptedByMember">
): AdaptationDisplay {
  const pendingCoach = isEscalating(modifier.modifierType) && modifier.reviewedBy === null;

  return {
    eyebrow: eyebrowFor(modifier.modifierType, pendingCoach),
    attribution: attributionFor(modifier.reviewedBy, pendingCoach),
    pendingCoach,
    showAcceptCTA: showAcceptCTAFor(modifier.modifierType, modifier.acceptedByMember),
  };
}

function isEscalating(action: AdaptiveAction): boolean {
  return (
    action === "paused_session" ||
    action === "deload_week_insertion" ||
    action === "escalate_to_coach"
  );
}

function eyebrowFor(action: AdaptiveAction, pendingCoach: boolean): string {
  if (pendingCoach) return "Coach gennemgår dagens session";
  switch (action) {
    case "paused_session":
      return "Dagens session er på pause";
    case "deload_week_insertion":
      return "Munks anbefaling: deload-uge";
    case "escalate_to_coach":
      return "Coach kigger på det";
    case "top_set_reduction":
      return "Topsæt-vægt reduceret";
    case "volume_reduction":
      return "Volumen reduceret";
    case "exercise_swap_variant":
      return "Øvelse byttet";
    case "session_shorten":
      return "Session afkortet";
    case "no_change":
      // Should never reach the UI — no_change rows are not persisted.
      return "Ingen ændring";
  }
}

function attributionFor(reviewedBy: string | null, pendingCoach: boolean): string {
  if (pendingCoach) return "Afventer Munks godkendelse";
  if (reviewedBy === "munk") return "Tilpasset af Munk";
  if (reviewedBy?.startsWith("co_coach:")) return "Tilpasset af coach";
  if (reviewedBy === "auto") return "Automatisk · baseret på din HRV";
  return "Automatisk";
}

function showAcceptCTAFor(
  action: AdaptiveAction,
  acceptedByMember: boolean | null
): boolean {
  // Escalations: no member CTA — Munk's call.
  if (isEscalating(action)) return false;
  // Already responded: don't re-prompt.
  if (acceptedByMember !== null) return false;
  return true;
}
