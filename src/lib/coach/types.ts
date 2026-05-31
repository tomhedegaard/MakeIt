/**
 * Munk Multiplier — shared coach-side types.
 *
 * Spec: docs/superpowers/specs/2026-05-26-munk-multiplier-v0-design.md §3, §4
 *
 * Split out so the morning-report builder (MM-2), the cohort-pattern
 * detectors (MM-3), and the data/cron layers (MM-7) all refer to one
 * canonical set of shapes.
 */

/* ================================================================== *
 * Cohort patterns (produced by MM-3, consumed by MM-2)
 * ================================================================== */

/** The four cross-member signals the engine surfaces. */
export type CohortPatternCode =
  | "hrv_cluster_day"
  | "rpe_drift_program_week"
  | "engine_reject_streak"
  | "form_check_decline";

/** One detected cohort pattern. `summaryDa` is the member-facing
 * Danish line; `affectedMemberIds` lets the coach drill in. */
export interface CohortPattern {
  code: CohortPatternCode;
  summaryDa: string;
  affectedMemberIds: string[];
}

/* ================================================================== *
 * Morning report — builder inputs (camelCase, pre-aggregated by cron)
 * ================================================================== */

export interface SustainedLowHrvMember {
  memberId: string;
  handle: string;
  /** Consecutive days the member's readiness has been low/very_low. */
  daysLow: number;
}

export interface MorningReportInputs {
  /** Members flagged by the HRV alert engine as sustained-low. */
  sustainedLowHrvMembers: SustainedLowHrvMember[];
  /** Count of open hrv_alerts with conditions_met.source='adaptive_v0'. */
  openAdaptiveEscalations: number;
  /** Form-check queue stats. */
  pendingFormChecks: { count: number; avgWaitHours: number };
  /** Cohort patterns from the weekly detector (MM-3). */
  patterns: CohortPattern[];
  /** Yesterday's activity roll-up. */
  yesterday: {
    sessionsCompleted: number;
    sessionsSkipped: number;
    prsNoted: number;
    formChecksUploaded: number;
    adaptiveModifiers: number;
    adaptiveAccepted: number;
  };
}

/* ================================================================== *
 * Morning report — persisted payload (snake_case jsonb)
 *
 * This is the exact shape stored in coach_morning_reports.payload and
 * read by /coach/morning. Snake_case to match the jsonb-on-the-wire
 * convention used elsewhere (input_snapshot, conditions_met, etc.).
 * ================================================================== */

export interface MorningReportPayload {
  urgent: {
    sustained_low_hrv_members: {
      member_id: string;
      handle: string;
      days_low: number;
    }[];
    open_adaptive_escalations: number;
    pending_form_checks: { count: number; avg_wait_hours: number };
  };
  patterns: {
    code: CohortPatternCode;
    summary_da: string;
    affected_member_ids: string[];
  }[];
  yesterday: {
    sessions_completed: number;
    sessions_skipped: number;
    prs_noted: number;
    form_checks_uploaded: number;
    adaptive_modifiers: number;
    adaptive_accepted: number;
  };
}

/** Overall urgency of a morning, drives headline + visual tone. */
export type MorningUrgency = "quiet" | "attention" | "urgent";
