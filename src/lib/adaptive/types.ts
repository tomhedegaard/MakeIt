/**
 * Adaptive Program Engine — shared types.
 *
 * Spec: docs/superpowers/specs/2026-05-25-adaptive-program-engine-v0-design.md
 *
 * Both the rule layer (engine.ts) and the reasoning layer (reasoning.ts)
 * consume `EngineInput` and produce `CandidateDecision`. Keeping types
 * shared means the reasoning layer can deserialize the rule layer's
 * output verbatim and the audit log can store either shape via the
 * `rule_decision` / `reasoning_output` jsonb columns.
 */

import type { ReadinessBucket, WarmUpState } from "@/lib/hrv/types";

/** Closed set of actions the engine can recommend (spec §3). */
export type AdaptiveAction =
  | "no_change"
  | "top_set_reduction"
  | "volume_reduction"
  | "paused_session"
  | "deload_week_insertion"
  | "exercise_swap_variant"
  | "session_shorten"
  | "escalate_to_coach";

/**
 * Structured parameters for an action. Different actions use different
 * keys; consumers branch on `action` and read the relevant field.
 *
 *  - top_set_reduction:     { percent: 5 | 10 | 15 }
 *  - volume_reduction:      { accessorySetsDropped: 1 | 2 | 3 }
 *  - exercise_swap_variant: { fromExerciseId, toExerciseId, variantReason }
 *  - paused_session, deload_week_insertion, session_shorten, escalate_to_coach,
 *    no_change: no params required (object may be empty).
 */
export interface AdaptiveActionParams {
  percent?: 5 | 10 | 15;
  accessorySetsDropped?: 1 | 2 | 3;
  fromExerciseId?: string;
  toExerciseId?: string;
  variantReason?: "joint_friendly" | "unilateral" | "low_cns" | "time_efficient";
}

/** Lifestyle log signal types (matches `hrv_lifestyle_logs.event_type`). */
export type LifestyleEventType =
  | "sleep_hours"
  | "alcohol"
  | "feeling"
  | "menstrual_phase"
  | "time_available";

/**
 * Aggregated lifestyle signals — pre-rolled by the data-layer wrapper
 * so the rule layer stays pure and side-effect-free.
 */
export interface LifestyleAggregate {
  /** Mean reported sleep duration across the last 2 logged days. Null if no log. */
  sleepHoursAvg2d: number | null;
  /** True iff alcohol logged on any of the last 2 calendar days. */
  alcoholLast2d: boolean;
  /** Most recent subjective feeling rating 1..5, or null if no log in last 3d. */
  feelingLast3d: number | null;
  /** Self-reported time available for today's session in minutes. Null if not logged. */
  timeAvailableMin: number | null;
}

/** Snapshot of the previous N sessions (oldest first). */
export interface RecentSessionSummary {
  sessionId: string;
  scheduledFor: string | null; // ISO date
  status: "scheduled" | "active" | "completed" | "skipped";
  /** Average logged_rpe across top sets (position=1) on the session. Null if no logs. */
  topSetRpeAvg: number | null;
  /** Average target_rpe across top sets on the session. Null if no targets. */
  topSetTargetRpeAvg: number | null;
  /** Logged sets / planned sets ratio (0..1). Null if no plans. */
  completionRatio: number | null;
}

/** Per-exercise form-check signal from the last 7 days. */
export interface RecentFormCheck {
  exerciseId: string;
  score: number; // 0..10
  reviewedAt: string; // ISO timestamp
}

/**
 * Pre-resolved "is there a lighter variant available for this exercise?"
 * lookup. Computed by the data-layer wrapper from `exercise_variant_map`.
 */
export interface NextSessionExerciseInfo {
  /** session_exercises.id */
  sessionExerciseId: string;
  /** exercises.id of the current planned exercise */
  exerciseId: string;
  exerciseName: string;
  /** Position in the session (1 = top/main lift). */
  position: number;
  /** True iff this exercise has at least one entry in exercise_variant_map. */
  hasLighterVariant: boolean;
  /** Pre-picked best lighter variant + reason, if any. */
  lighterVariant: {
    exerciseId: string;
    variantReason: AdaptiveActionParams["variantReason"];
  } | null;
}

/**
 * Pure input bundle for the engine. The data-layer wrapper fetches all
 * fields from Supabase and hands them in. The rule layer never touches
 * the DB itself.
 */
export interface EngineInput {
  memberId: string;

  /** Member-level opt-in flag (`hrv_settings.adaptive_program_enabled`). */
  adaptiveProgramEnabled: boolean;

  /**
   * Most recent HRV reading. `null` if no reading exists at all. The
   * rule layer additionally checks freshness (≤36h) and warmUpState.
   */
  latestReading: {
    measuredAt: string; // ISO
    warmUpState: WarmUpState;
    readinessBucket: ReadinessBucket | null;
    isSick: boolean;
  } | null;

  /**
   * Count of `very_low` readiness days in the last 5 daily readings.
   * Used for sustained-low → deload escalation.
   */
  veryLowDaysLast5: number;

  /**
   * Trend of average top-set RPE delta (logged − target) across the last
   * 14 days. Positive = athlete reports higher RPE than coach prescribed.
   * Null if insufficient data.
   */
  rpeDriftLast14d: number | null;

  /** Aggregated lifestyle signals. */
  lifestyle: LifestyleAggregate;

  /** Last 3 completed/skipped sessions, oldest first. */
  recentSessions: RecentSessionSummary[];

  /** Form-check scores from the last 7 days, all exercises. */
  recentFormChecks: RecentFormCheck[];

  /** Days since the member's last heavy main lift (lowest across squat/bench/deadlift/ohp). */
  daysSinceHeavyLift: number | null;

  /**
   * The session the engine is about to mutate. `null` means no upcoming
   * session in the next 48h — engine exits silently.
   */
  nextSession: {
    sessionId: string;
    scheduledFor: string; // ISO date
    title: string;
    week: number | null;
    exercises: NextSessionExerciseInfo[];
  } | null;

  /** Injected so tests can pin the clock. */
  now: Date;
}

/**
 * Reason codes the rule layer attaches to its decision. Stable identifiers
 * (snake_case, ASCII) — translated to Danish for member-facing copy by
 * `engine.formatExplanationDa`.
 */
export type RuleReasonCode =
  | "opt_out"
  | "no_reading"
  | "stale_reading"
  | "warmup_incomplete"
  | "no_next_session"
  | "sick_marker"
  | "hrv_very_low"
  | "hrv_low"
  | "low_sleep"
  | "recent_alcohol"
  | "low_feeling"
  | "rpe_overshoot"
  | "rpe_drift_rising"
  | "missed_sessions"
  | "sustained_low_readiness"
  | "form_check_concern"
  | "time_constraint"
  | "unusual_signal_combination"
  | "no_actionable_signals";

/**
 * What the rule layer produces. Stored verbatim in
 * `hrv_session_modifiers.rule_decision` jsonb.
 */
export interface CandidateDecision {
  action: AdaptiveAction;
  /** Confidence 0..1 — higher = rule is more sure. */
  confidence: number;
  /** Stable reason codes used for telemetry + explanation rendering. */
  reasons: RuleReasonCode[];
  /** Structured parameters for the action (empty for no-arg actions). */
  params: AdaptiveActionParams;
  /**
   * True iff the rule layer believes a human (Munk or co-coach) should
   * see this decision before it surfaces to the member. Always true for
   * deload_week_insertion, paused_session, escalate_to_coach.
   */
  humanReviewRecommended: boolean;
  /**
   * Danish fallback explanation. Used by the member-facing UI when the
   * reasoning layer is unavailable. Reasoning layer overwrites this when
   * it runs successfully.
   */
  explanationDa: string;
}
