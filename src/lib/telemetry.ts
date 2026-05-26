/**
 * Lightweight, pluggable event tracker.
 *
 * Spec: docs/superpowers/specs/2026-05-26-open-brain-ui-v0-design.md §8
 *
 * v0 has no analytics SDK wired up — events go to `console.info` under
 * the `[telemetry]` prefix so they're visible in dev tools and Vercel
 * function logs. When PostHog (or any successor) eventually lands,
 * replace the body of `track()` to forward events to its `capture()`
 * call — no consumer needs to change.
 *
 * Design choices:
 *
 *   - Single `track(name, props)` API instead of a discriminated union.
 *     Verbose but stays out of the way at call sites.
 *   - Event-name constants exported as `TELEMETRY` so typos are caught
 *     at compile time and a global rename is mechanical.
 *   - SSR-safe: `track()` no-ops when `window` is undefined so server
 *     components and tests can call it without guards.
 *   - No deps. Adding @posthog/posthog-js / @posthog/node is a
 *     deliberate platform choice we'd want to make once, not bury in
 *     a v0 component file.
 */

/** Stable event names. Strings (not enums) so the wire format is
 * obvious in logs and dashboards. */
export const TELEMETRY = {
  /** Member expanded "Vis tankegang" on an AdaptationCard. */
  adaptiveReasoningRevealed: "adaptive_reasoning_revealed",
  /** Member made the first slider change inside the counterfactual playground. */
  adaptiveCounterfactualUsed: "adaptive_counterfactual_used",
  /**
   * Hypothetical decision crossed a rule boundary (action changed
   * relative to baseline OR back to baseline after diverging). Skips
   * intermediate slider positions that didn't flip the action.
   */
  adaptiveCounterfactualResult: "adaptive_counterfactual_result",
  /** /hrv "Tidligere tilpasninger" section rendered in the member's viewport. */
  adaptiveHistoryViewed: "adaptive_history_viewed",
  /** Member clicked "Vis flere (N)" to expand the truncated history. */
  adaptiveHistoryExpanded: "adaptive_history_expanded",
} as const;

export type TelemetryEventName = (typeof TELEMETRY)[keyof typeof TELEMETRY];

/**
 * Emit a telemetry event. No-op on the server side (SSR / tests). On
 * the client, structured log to console.info with the event name +
 * properties. Future analytics SDK plugs into this single call site.
 */
export function track(
  name: TelemetryEventName,
  props?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  console.info("[telemetry]", name, props ?? {});
}
