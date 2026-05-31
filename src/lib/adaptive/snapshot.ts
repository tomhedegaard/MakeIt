/**
 * Adaptive Program Engine — hydrate an EngineInput from its persisted
 * jsonb snapshot.
 *
 * Spec: docs/superpowers/specs/2026-05-26-open-brain-ui-v0-design.md §4
 *
 * The persistence layer writes a trimmed snapshot of `EngineInput`
 * into `hrv_session_modifiers.input_snapshot` at decision time
 * (see `buildInputSnapshot` in `persist.ts`). The Open Brain UI
 * needs to read it back to:
 *
 *   1. Render the "Hvad motoren så" subpanel (T2 reasoning detail)
 *   2. Feed counterfactual recomputes (T3 sliders) — re-invoking the
 *      pure rule layer client-side with mutated lifestyle values
 *
 * **Lossy by design.** The snapshot drops two array-shaped fields to
 * keep the jsonb small:
 *
 *   - `recentFormChecks` (replaced with just a count for context)
 *   - `nextSession.exercises` (replaced with just a count)
 *
 * That means counterfactuals can't recompute the
 * `exercise_swap_variant` or `form_check_concern` paths from a
 * hydrated snapshot. v0 of Open Brain only mutates lifestyle
 * dimensions (sleep / alcohol / feeling) which don't touch those
 * paths — so the lossy reconstruction is exactly enough.
 *
 * This module is pure: no DB, no React. Tests exercise the full
 * round-trip (build → hydrate) and edge cases (null snapshot,
 * malformed jsonb, missing fields).
 */

import type {
  EngineInput,
  LifestyleAggregate,
  NextSessionExerciseInfo,
  RecentSessionSummary,
} from "./types";
import type { FeelingState } from "@/lib/hrv/lifestyle";
import type { ReadinessBucket, WarmUpState } from "@/lib/hrv/types";

/* ================================================================== *
 * Snapshot shape — mirrors what buildInputSnapshot writes.
 *
 * Kept here as a typed declaration even though the wire format is
 * jsonb (= unknown). Pulling the runtime extraction code through this
 * type makes the contract between persist.ts and snapshot.ts explicit.
 * ================================================================== */

interface SnapshotShape {
  member_id?: string;
  now?: string;
  reading?: {
    measured_at: string;
    warm_up_state: WarmUpState;
    readiness_bucket: ReadinessBucket | null;
    is_sick: boolean;
  } | null;
  very_low_days_last_5?: number;
  rpe_drift_last_14d?: number | null;
  lifestyle?: {
    sleep_hours_avg_2d: number | null;
    alcohol_last_2d: boolean;
    feeling_last_3d: FeelingState | null;
  };
  recent_sessions_summary?: Array<{
    status?: RecentSessionSummary["status"];
    top_set_rpe_avg?: number | null;
    top_set_target_rpe_avg?: number | null;
  }>;
  recent_form_check_count?: number;
  days_since_heavy_lift?: number | null;
  next_session?: {
    session_id: string;
    scheduled_for: string;
    title: string;
    week: number | null;
    exercise_count: number;
  } | null;
}

/* ================================================================== *
 * Public API
 * ================================================================== */

/**
 * Reconstruct an `EngineInput` from a persisted snapshot. Never
 * throws — malformed or missing fields fall through to sensible
 * defaults so the UI can always render something.
 *
 * Use `createdAt` as the engine's `now` clock. This means
 * counterfactuals see the same wall-clock the original decision did,
 * which is the right semantics: the member is asking "given the
 * data on day X, what would the engine have done differently?" not
 * "given today's data".
 *
 * @param snapshot Raw jsonb from `hrv_session_modifiers.input_snapshot`.
 *                 Accept `unknown` to tolerate corrupt or partial
 *                 historical rows.
 * @param createdAt The modifier's `created_at` (used as the input's
 *                   `now: Date` so counterfactual logic time-anchors
 *                   correctly).
 */
export function hydrateEngineInputFromSnapshot(
  snapshot: unknown,
  createdAt: Date
): EngineInput {
  const s = (typeof snapshot === "object" && snapshot !== null
    ? (snapshot as SnapshotShape)
    : {}) satisfies SnapshotShape;

  return {
    memberId: typeof s.member_id === "string" ? s.member_id : "",
    // The card has already been generated, so the member already
    // opted in by definition — surface that explicitly for the
    // counterfactual case where this matters (rule layer's hard-exit
    // logic is gated on this flag).
    adaptiveProgramEnabled: true,
    latestReading: hydrateReading(s.reading),
    veryLowDaysLast5: clampInt(s.very_low_days_last_5, 0, 0, 5),
    rpeDriftLast14d:
      typeof s.rpe_drift_last_14d === "number" ? s.rpe_drift_last_14d : null,
    lifestyle: hydrateLifestyle(s.lifestyle),
    recentSessions: hydrateRecentSessions(s.recent_sessions_summary),
    // Lossy: snapshot only stored a count, not the array. UI renders
    // the count separately; engine logic that touches the array
    // (form_check_concern signal) won't fire on a hydrated input.
    recentFormChecks: [],
    daysSinceHeavyLift:
      typeof s.days_since_heavy_lift === "number"
        ? s.days_since_heavy_lift
        : null,
    nextSession: hydrateNextSession(s.next_session),
    now: createdAt,
  };
}

/**
 * Useful for the UI: how many form-checks were considered at decision
 * time. The hydrator drops the array (snapshot is lossy) but we keep
 * the count accessible separately for the "Hvad motoren så" subpanel
 * to render "5 form-checks i sidste uge".
 */
export function recentFormCheckCountFromSnapshot(
  snapshot: unknown
): number {
  if (typeof snapshot !== "object" || snapshot === null) return 0;
  const count = (snapshot as SnapshotShape).recent_form_check_count;
  return typeof count === "number" && count >= 0 ? count : 0;
}

/**
 * Useful for the UI: how many exercises were in the targeted session.
 * Same lossy-but-keep-the-count pattern as form-checks.
 */
export function nextSessionExerciseCountFromSnapshot(
  snapshot: unknown
): number {
  if (typeof snapshot !== "object" || snapshot === null) return 0;
  const count = (snapshot as SnapshotShape).next_session?.exercise_count;
  return typeof count === "number" && count >= 0 ? count : 0;
}

/* ================================================================== *
 * Section hydrators
 * ================================================================== */

function hydrateReading(
  raw: SnapshotShape["reading"]
): EngineInput["latestReading"] {
  if (!raw) return null;
  if (typeof raw.measured_at !== "string") return null;
  return {
    measuredAt: raw.measured_at,
    warmUpState: isWarmUpState(raw.warm_up_state) ? raw.warm_up_state : "discovery",
    readinessBucket: isReadinessBucket(raw.readiness_bucket)
      ? raw.readiness_bucket
      : null,
    isSick: raw.is_sick === true,
  };
}

function hydrateLifestyle(
  raw: SnapshotShape["lifestyle"]
): LifestyleAggregate {
  if (!raw) {
    return {
      sleepHoursAvg2d: null,
      alcoholLast2d: false,
      feelingLast3d: null,
    };
  }
  return {
    sleepHoursAvg2d:
      typeof raw.sleep_hours_avg_2d === "number"
        ? raw.sleep_hours_avg_2d
        : null,
    alcoholLast2d: raw.alcohol_last_2d === true,
    feelingLast3d: isFeelingState(raw.feeling_last_3d)
      ? raw.feeling_last_3d
      : null,
  };
}

function hydrateRecentSessions(
  raw: SnapshotShape["recent_sessions_summary"]
): RecentSessionSummary[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row, idx) => ({
    // Snapshot dropped sessionId / scheduledFor — synthesise stable
    // placeholders so downstream code that keys by sessionId still
    // works (no collision since the array is per-modifier).
    sessionId: `snapshot-session-${idx}`,
    scheduledFor: null,
    status: isSessionStatus(row?.status) ? row.status : "completed",
    topSetRpeAvg:
      typeof row?.top_set_rpe_avg === "number" ? row.top_set_rpe_avg : null,
    topSetTargetRpeAvg:
      typeof row?.top_set_target_rpe_avg === "number"
        ? row.top_set_target_rpe_avg
        : null,
    // Snapshot dropped completion_ratio entirely; assume 1.0 (full
    // completion) so volume_reduction's "missed sessions" path
    // doesn't fire on hydrated inputs.
    completionRatio: 1,
  }));
}

function hydrateNextSession(
  raw: SnapshotShape["next_session"]
): EngineInput["nextSession"] {
  if (!raw) return null;
  // Synthesise an `exercises` array of `exercise_count` empty entries
  // so positional logic in the engine (looking for position=1) does
  // not crash. Each entry has no exercise_id / no variant — the
  // form_check_concern and exercise_swap_variant paths therefore
  // can't fire from a hydrated input, which is the spec's intent
  // (lossy by design — see module docstring).
  const exerciseCount = Math.max(
    0,
    typeof raw.exercise_count === "number" ? raw.exercise_count : 0
  );
  const exercises: NextSessionExerciseInfo[] = Array.from(
    { length: exerciseCount },
    (_, i) => ({
      sessionExerciseId: `snapshot-exercise-${i}`,
      exerciseId: "",
      exerciseName: i === 0 ? "Hovedløft" : `Øvelse ${i + 1}`,
      position: i + 1,
      hasLighterVariant: false,
      lighterVariant: null,
    })
  );
  return {
    sessionId: typeof raw.session_id === "string" ? raw.session_id : "",
    scheduledFor:
      typeof raw.scheduled_for === "string" ? raw.scheduled_for : "",
    title: typeof raw.title === "string" ? raw.title : "",
    week: typeof raw.week === "number" ? raw.week : null,
    exercises,
  };
}

/* ================================================================== *
 * Narrow helpers
 * ================================================================== */

function isWarmUpState(v: unknown): v is WarmUpState {
  return v === "discovery" || v === "provisional" || v === "active";
}

function isReadinessBucket(v: unknown): v is ReadinessBucket {
  return (
    v === "very_low" ||
    v === "low" ||
    v === "normal" ||
    v === "high" ||
    v === "very_high"
  );
}

function isFeelingState(v: unknown): v is FeelingState {
  return v === "fresh" || v === "ok" || v === "tired" || v === "stressed";
}

function isSessionStatus(v: unknown): v is RecentSessionSummary["status"] {
  return (
    v === "scheduled" || v === "active" || v === "completed" || v === "skipped"
  );
}

function clampInt(
  v: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(v)));
}
