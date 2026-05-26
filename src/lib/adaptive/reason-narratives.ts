/**
 * Adaptive Program Engine — reason-codes → Danish copy.
 *
 * Spec: docs/superpowers/specs/2026-05-26-open-brain-ui-v0-design.md §5
 *
 * Pure lookups + a small narrative assembler. No DB, no React.
 * Consumed by ReasoningDetailPanel (T2) and CounterfactualSliders
 * (T3) to render member-facing copy from the engine's stable
 * `RuleReasonCode` strings.
 *
 * Three exports:
 *
 *   - `labelForReason(code)`    short chip label for one signal
 *   - `labelForAction(action)`  short Danish action label
 *   - `narrateRule({ action, reasons })`
 *                               one-line "signals → action" sentence
 *                               for "Hvilken regel fyrede"
 *
 * Design choices:
 *
 *   - List individual lifestyle signals rather than rolling them up
 *     under a generic "livsstilsfaktor". "kort søvn + alkohol" is
 *     more concrete than "to livsstilsfaktorer" and matches what
 *     the engine actually saw.
 *   - Unknown reason / action codes fall back to the raw code so
 *     missing copy is visible (not silently rendered as "").
 *   - Hard-exit reasons (opt_out, no_reading, stale_reading,
 *     warmup_incomplete, no_next_session, no_actionable_signals)
 *     have labels too — T2 is only rendered for persisted modifiers
 *     where these don't appear, but the labels are useful for
 *     telemetry dashboards and the demo seed's documentation.
 */

import type { AdaptiveAction, RuleReasonCode } from "./types";

/* ================================================================== *
 * Reason labels (chip-sized, ≤22 chars where possible)
 * ================================================================== */

const REASON_LABELS: Record<RuleReasonCode, string> = {
  // Hard-exit codes — rare in UI, common in telemetry.
  opt_out: "Adaptiv tilpasning fra",
  no_reading: "Ingen HRV-måling",
  stale_reading: "HRV-måling for gammel",
  warmup_incomplete: "Baseline under opbygning",
  no_next_session: "Ingen kommende session",

  // Critical signals.
  sick_marker: "Syg-markering",
  hrv_very_low: "HRV meget lav",
  hrv_low: "HRV lav",

  // Lifestyle.
  low_sleep: "Kort søvn",
  recent_alcohol: "Alkohol seneste dage",
  low_feeling: "Lav energi",

  // Training history.
  rpe_overshoot: "Sidste session var hård",
  rpe_drift_rising: "RPE stiger over tid",
  missed_sessions: "Missede sessions",
  sustained_low_readiness: "Vedvarende lav HRV",
  form_check_concern: "Form-tilbageskridt",

  // Composite / fallback.
  unusual_signal_combination: "Usædvanlig kombination",
  no_actionable_signals: "Alt ser normalt ud",
};

export function labelForReason(code: RuleReasonCode | string): string {
  if (code in REASON_LABELS) {
    return REASON_LABELS[code as RuleReasonCode];
  }
  // Unknown code — surface it raw rather than silently hiding it.
  return code;
}

/* ================================================================== *
 * Action labels (one short Danish phrase per action)
 * ================================================================== */

const ACTION_LABELS: Record<AdaptiveAction, string> = {
  no_change: "ingen ændring",
  top_set_reduction: "topsæt-vægt reduceret",
  volume_reduction: "accessory-volumen reduceret",
  paused_session: "session pauset",
  deload_week_insertion: "deload-uge anbefalet",
  exercise_swap_variant: "bytte til lettere variant",
  session_shorten: "session afkortet",
  escalate_to_coach: "coach gennemgår",
};

export function labelForAction(action: AdaptiveAction | string): string {
  if (action in ACTION_LABELS) {
    return ACTION_LABELS[action as AdaptiveAction];
  }
  return action;
}

/* ================================================================== *
 * Rule narrative — "signals → action"
 * ================================================================== */

export interface NarrateRuleInput {
  action: AdaptiveAction;
  reasons: RuleReasonCode[];
}

/**
 * Assemble a one-line Danish "rule fired" sentence from an action +
 * reason list. Shape: `<reason phrase> → <action label>`.
 *
 * The reason phrase joins individual labels with " + " in the order
 * provided (the rule layer emits reasons in a deliberate order —
 * primary signal first, lifestyle co-factors after). For empty
 * reasons list we render just the action.
 *
 * Examples:
 *   { action: 'top_set_reduction', reasons: ['hrv_low', 'low_sleep'] }
 *     → "HRV lav + Kort søvn → topsæt-vægt reduceret"
 *
 *   { action: 'paused_session', reasons: ['sick_marker'] }
 *     → "Syg-markering → session pauset"
 *
 *   { action: 'escalate_to_coach',
 *     reasons: ['unusual_signal_combination', 'hrv_low', 'recent_alcohol'] }
 *     → "Usædvanlig kombination + HRV lav + Alkohol seneste dage → coach gennemgår"
 */
export function narrateRule(input: NarrateRuleInput): string {
  const reasonPhrase = input.reasons.map(labelForReason).join(" + ");
  const actionLabel = labelForAction(input.action);
  if (!reasonPhrase) return actionLabel;
  return `${reasonPhrase} → ${actionLabel}`;
}
