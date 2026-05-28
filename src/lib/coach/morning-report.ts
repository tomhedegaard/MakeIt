/**
 * Munk Multiplier — morning report payload builder (MM-2).
 *
 * Spec: docs/superpowers/specs/2026-05-26-munk-multiplier-v0-design.md §3
 *
 * Pure: no DB, no React. The cron (MM-7) fetches + aggregates the raw
 * inputs and hands them here; the page (/coach/morning) reads the
 * persisted payload. Keeping the transform pure means the ranking +
 * urgency + Danish-copy logic lives in one tested place.
 *
 * Three responsibilities:
 *   1. buildMorningReportPayload — camelCase inputs → snake_case
 *      jsonb payload, with sorting + clamping.
 *   2. assessMorningUrgency — quiet / attention / urgent.
 *   3. buildMorningHeadline — the Danish headline for each urgency,
 *      including the honest "Stille morgen" copy for quiet days.
 */

import type {
  MorningReportInputs,
  MorningReportPayload,
  MorningUrgency,
} from "./types";

/** Max members listed in the urgent block — keeps the morning page
 * scannable. Overflow is summarised in the headline count. */
const MAX_SUSTAINED_LOW_LISTED = 8;

/** Non-negative integer guard for roll-up counters. */
function nonNeg(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/** Non-negative number (allows fractional, e.g. avg wait hours). */
function nonNegFloat(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/**
 * Build the persisted payload from pre-aggregated inputs. Pure.
 *
 * - sustained_low_hrv_members sorted by days_low descending (most
 *   urgent first), capped at MAX_SUSTAINED_LOW_LISTED.
 * - All counters clamped to non-negative integers.
 * - camelCase → snake_case for the jsonb wire format.
 */
export function buildMorningReportPayload(
  inputs: MorningReportInputs
): MorningReportPayload {
  const sustained = [...inputs.sustainedLowHrvMembers]
    .sort((a, b) => b.daysLow - a.daysLow)
    .slice(0, MAX_SUSTAINED_LOW_LISTED)
    .map((m) => ({
      member_id: m.memberId,
      handle: m.handle,
      days_low: nonNeg(m.daysLow),
    }));

  return {
    urgent: {
      sustained_low_hrv_members: sustained,
      open_adaptive_escalations: nonNeg(inputs.openAdaptiveEscalations),
      pending_form_checks: {
        count: nonNeg(inputs.pendingFormChecks.count),
        avg_wait_hours:
          Math.round(nonNegFloat(inputs.pendingFormChecks.avgWaitHours) * 10) /
          10,
      },
    },
    patterns: inputs.patterns.map((p) => ({
      code: p.code,
      summary_da: p.summaryDa,
      affected_member_ids: p.affectedMemberIds,
    })),
    yesterday: {
      sessions_completed: nonNeg(inputs.yesterday.sessionsCompleted),
      sessions_skipped: nonNeg(inputs.yesterday.sessionsSkipped),
      prs_noted: nonNeg(inputs.yesterday.prsNoted),
      form_checks_uploaded: nonNeg(inputs.yesterday.formChecksUploaded),
      adaptive_modifiers: nonNeg(inputs.yesterday.adaptiveModifiers),
      adaptive_accepted: nonNeg(inputs.yesterday.adaptiveAccepted),
    },
  };
}

/**
 * Classify the morning's urgency from the payload.
 *
 *   - urgent:    any sustained-low member OR any open escalation.
 *                These need Munk's attention before training time.
 *   - attention: no urgent items, but cohort patterns exist worth a
 *                look (not time-critical).
 *   - quiet:     nothing but the routine form-check queue.
 *
 * Pending form-checks alone never escalate past quiet — they're the
 * normal daily workload, not a red flag.
 */
export function assessMorningUrgency(
  payload: MorningReportPayload
): MorningUrgency {
  const hasUrgent =
    payload.urgent.sustained_low_hrv_members.length > 0 ||
    payload.urgent.open_adaptive_escalations > 0;
  if (hasUrgent) return "urgent";
  if (payload.patterns.length > 0) return "attention";
  return "quiet";
}

/**
 * Danish headline for the morning report. Honest copy — quiet
 * mornings say so plainly rather than manufacturing urgency.
 */
export function buildMorningHeadline(
  payload: MorningReportPayload,
  urgency: MorningUrgency = assessMorningUrgency(payload)
): string {
  if (urgency === "quiet") {
    const q = payload.urgent.pending_form_checks.count;
    if (q === 0) {
      return "Stille morgen. Tom kø — ingen røde flag. Nyd kaffen.";
    }
    return `Stille morgen. ${q} ${q === 1 ? "form-check" : "form-checks"} i kø — ingen røde flag. Nyd kaffen.`;
  }

  if (urgency === "attention") {
    const n = payload.patterns.length;
    return `${n} ${n === 1 ? "mønster" : "mønstre"} på tværs at kigge på i dag.`;
  }

  // urgent — count distinct urgent buckets so the headline reflects
  // the actual spread, not just one number.
  const lowCount = payload.urgent.sustained_low_hrv_members.length;
  const escalations = payload.urgent.open_adaptive_escalations;
  const parts: string[] = [];
  if (lowCount > 0) {
    parts.push(
      `${lowCount} ${lowCount === 1 ? "medlem" : "medlemmer"} med vedvarende lav HRV`
    );
  }
  if (escalations > 0) {
    parts.push(
      `${escalations} ${escalations === 1 ? "eskalering" : "eskaleringer"} fra motoren`
    );
  }
  return `Kræver dig nu: ${parts.join(" · ")}.`;
}
