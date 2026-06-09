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

  // Mental signal (Søjle 5 / MH-6).
  mental_state_low_energy_or_high_stress: "Mental belastning",
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

/* ================================================================== *
 * Signal formatters — small Danish helpers used by ReasoningDetailPanel
 * to render rows of "what the engine saw". Kept here (rather than in
 * the component) so they're testable in isolation and share the
 * adaptive UI's Danish-copy module.
 * ================================================================== */

import type { ReadinessBucket } from "@/lib/hrv/types";
import type { FeelingState } from "@/lib/hrv/lifestyle";

const READINESS_BUCKET_LABELS: Record<ReadinessBucket, string> = {
  very_low: "Langt under din norm",
  low: "Under din norm",
  normal: "I dit normale område",
  high: "Over din norm",
  very_high: "Langt over din norm",
};

export function formatReadinessBucket(
  bucket: ReadinessBucket | null
): string {
  if (bucket === null) return "—";
  return READINESS_BUCKET_LABELS[bucket] ?? "—";
}

const FEELING_LABELS: Record<FeelingState, string> = {
  fresh: "Frisk",
  ok: "Okay",
  tired: "Træt",
  stressed: "Stresset",
};

export function formatFeelingState(state: FeelingState | null): string {
  if (state === null) return "—";
  return FEELING_LABELS[state] ?? "—";
}

/**
 * Format sleep hours as "5t12m". Null returns em-dash. Negative or
 * non-finite values return em-dash. >12h is rounded down to 12h to
 * keep the chip width predictable (extreme self-reports are
 * outliers we don't need to display precisely).
 */
export function formatSleepHours(hours: number | null): string {
  if (hours === null || !Number.isFinite(hours) || hours <= 0) return "—";
  const capped = Math.min(12, hours);
  const wholeHours = Math.floor(capped);
  const minutes = Math.round((capped - wholeHours) * 60);
  if (minutes === 0) return `${wholeHours}t`;
  return `${wholeHours}t${String(minutes).padStart(2, "0")}m`;
}

/**
 * Format the top-set RPE delta as "8.5 vs 8 (+0.5)". Both values
 * required — null in either input returns em-dash. Delta sign is
 * always shown (positive overshoot is the signal we care about).
 */
export function formatRpeDelta(
  logged: number | null,
  target: number | null
): string {
  if (
    logged === null ||
    target === null ||
    !Number.isFinite(logged) ||
    !Number.isFinite(target)
  ) {
    return "—";
  }
  const delta = logged - target;
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "±";
  const mag = Math.abs(delta);
  // 1 decimal unless we're at a whole number — then drop it.
  const fmt = (n: number) =>
    Number.isInteger(n) ? String(n) : n.toFixed(1);
  return `${fmt(logged)} vs ${fmt(target)} (${sign}${fmt(mag)})`;
}

/* ================================================================== *
 * Rule narrative — "signals → action"
 * ================================================================== */

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
