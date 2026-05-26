/**
 * Pure helpers for the "Tidligere tilpasninger" surface on /hrv.
 *
 * Spec: docs/superpowers/specs/2026-05-26-open-brain-ui-v0-design.md §3 (T4)
 *
 * Two responsibilities:
 *   1. Map the (acceptedByMember, reviewedBy) state pair to a member-
 *      facing status icon + Danish label.
 *   2. Format the RPE-delta + next-day-readiness micro-context lines
 *      shown under each row.
 *
 * Kept in lib/adaptive/ (not in the component) so the mappings stay
 * unit-tested and re-usable. Inputs are the narrowed
 * AdaptationHistoryItem shape from lib/data/adaptive.ts.
 */

import type { ReadinessBucket } from "@/lib/hrv/types";

export interface AdaptationOutcomeDisplay {
  /** Icon glyph rendered at the row's right edge. "·" when neutral. */
  icon: "✓" | "✗" | "·";
  /** Short Danish label paired with the icon. */
  label: string;
  /**
   * Tone hint for the row container. `quiet` = neutral / accepted;
   * `dim` = member kept original; `pending` = waiting for review.
   */
  tone: "quiet" | "dim" | "pending";
}

interface OutcomeInput {
  acceptedByMember: boolean | null;
  reviewedBy: string | null;
}

/**
 * Derive the row's status badge from the persisted state. Pure.
 *
 * Cases:
 *   - reviewedBy='auto' + accepted=true/null → "accepteret" (the
 *     default state after the cron fires; member hasn't actively
 *     said no)
 *   - reviewedBy='auto' + accepted=false → "behold original"
 *   - reviewedBy='munk' + accepted!=false → "Munk godkendte"
 *   - reviewedBy='munk' + accepted=false → "Munk afviste"
 *   - reviewedBy startsWith 'co_coach:' → "Coach godkendte" / "Coach afviste"
 *   - reviewedBy=null + accepted=null → "afventer review" (rare —
 *     escalation just fired, coach hasn't touched it yet)
 */
export function describeAdaptationOutcome(
  input: OutcomeInput
): AdaptationOutcomeDisplay {
  const { acceptedByMember, reviewedBy } = input;

  // Coach-driven (or co-coach-driven) outcomes — the member didn't
  // need to choose; coach made the call.
  if (reviewedBy === "munk" || reviewedBy?.startsWith("co_coach:")) {
    const who = reviewedBy === "munk" ? "Munk" : "Coach";
    if (acceptedByMember === false) {
      return { icon: "✗", label: `${who} afviste`, tone: "dim" };
    }
    return { icon: "✓", label: `${who} godkendte`, tone: "quiet" };
  }

  // Auto-signed engine decisions where the member made a choice.
  if (reviewedBy === "auto") {
    if (acceptedByMember === false) {
      return { icon: "✗", label: "Behold original", tone: "dim" };
    }
    return { icon: "✓", label: "Accepteret", tone: "quiet" };
  }

  // Reviewed-by is null — escalation has been emitted but coach
  // hasn't actioned it yet. Member sees "afventer review" in their
  // history so it's not invisible.
  return { icon: "·", label: "Afventer review", tone: "pending" };
}

/**
 * Format the RPE-delta micro-line as "RPE-delta +0.3" / "−0.5" /
 * "±0.0". Null → null (caller omits the line).
 */
export function formatHistoryRpeDelta(delta: number | null): string | null {
  if (delta === null || !Number.isFinite(delta)) return null;
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "±";
  const mag = Math.abs(delta);
  const fmt = mag.toFixed(mag < 0.1 ? 1 : 1);
  return `RPE-delta ${sign}${fmt}`;
}

const READINESS_BUCKET_SHORT: Record<ReadinessBucket, string> = {
  very_low: "meget lav",
  low: "lav",
  normal: "normal",
  high: "høj",
  very_high: "meget høj",
};

/**
 * Format the next-day readiness micro-line. Returns null when the
 * bucket is missing (member didn't sync the day after, or the
 * session was on a rest-day boundary).
 */
export function formatNextDayReadiness(
  bucket: ReadinessBucket | null
): string | null {
  if (bucket === null) return null;
  const short = READINESS_BUCKET_SHORT[bucket] ?? null;
  if (!short) return null;
  return `Næste dags HRV: ${short}`;
}

/**
 * Format a Danish short date for the row's left-edge pill: "24. maj".
 * Pinned to the da-DK locale; no time of day.
 */
export function formatHistoryDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
  });
}
