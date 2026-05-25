/**
 * Adaptive Program Engine — persistence layer.
 *
 * Spec: docs/superpowers/specs/2026-05-25-adaptive-program-engine-v0-design.md §4
 *
 * Responsibilities:
 *   1. Idempotency check — at most one `adaptive_v0` modifier per
 *      (member_id, session_id). Re-runs of the daily cron are no-ops.
 *   2. Build the `hrv_session_modifiers` row from the rule decision
 *      (and the optional reasoning-layer refinement).
 *   3. Insert the modifier.
 *   4. If the decision warrants human review, insert a matching
 *      `hrv_alerts` row that links back via `session_modifier_id`
 *      so Munk's existing queue surfaces it.
 *
 * Failure model: the modifier insert is the source of truth. If the
 * alert insert fails afterwards, we log loudly but don't roll back —
 * the member still sees the placeholder ("Coach reviewing today's
 * plan") and the next cron tick won't double-create the modifier
 * (idempotency check above). The ops dashboard surfaces modifiers
 * with `reviewed_by IS NULL AND created_at < now() - interval '2h'`
 * as a stale-escalation alert.
 *
 * The pure helpers (`buildModifierRow`, `shouldEscalate`,
 * `buildAlertRow`) are exported for unit testing. The async
 * `persistAdaptation` wrapper is integration-tested.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/database.types";

import type {
  AdaptiveAction,
  CandidateDecision,
  EngineInput,
} from "./types";

/** Actions that always escalate to a human reviewer, regardless of confidence. */
const ALWAYS_ESCALATING_ACTIONS: ReadonlySet<AdaptiveAction> = new Set([
  "paused_session",
  "deload_week_insertion",
  "escalate_to_coach",
]);

/** Context the persistence layer needs but the engine doesn't. */
export interface PersistContext {
  memberId: string;
  sessionId: string;
  programId: string | null;
}

/**
 * Optional output from the reasoning layer. If present, its
 * `explanationDa` and `params` override the rule layer's; the full
 * blob is stored in `reasoning_output` for audit/retraining.
 */
export interface ReasoningRefinement {
  /** Full Claude output, stored verbatim in reasoning_output jsonb. */
  rawOutput: Json;
  /** Member-facing Danish explanation (Claude usually produces a better one). */
  explanationDa: string;
  /** Final confidence after refinement (Claude may downgrade or upgrade). */
  confidence: number;
  /** Whether Claude wants a human to see this before surfacing. */
  humanReviewRecommended: boolean;
  /** Refined action params (Claude may pick percent: 5 vs 10 vs 15, etc.). */
  paramsOverride?: CandidateDecision["params"];
}

export type PersistResult =
  | { skipped: true; reason: "no_action" | "duplicate"; modifierId?: string }
  | {
      skipped: false;
      modifierId: string;
      alertId: string | null;
    };

/**
 * Decides whether a modifier row needs a matching hrv_alerts row.
 *
 * Two paths to escalation:
 *   - Action is one of the always-escalating types.
 *   - Confidence-gated: the reasoning layer (or rule layer as fallback)
 *     marked humanReviewRecommended=true.
 */
export function shouldEscalate(
  action: AdaptiveAction,
  humanReviewRecommended: boolean
): boolean {
  // no_change is not a decision — there's nothing to escalate. The
  // persistAdaptation wrapper short-circuits no_change before reaching
  // here, but the helper stays correct in isolation.
  if (action === "no_change") return false;
  if (ALWAYS_ESCALATING_ACTIONS.has(action)) return true;
  return humanReviewRecommended;
}

/**
 * Trimmed snapshot of the engine input, stored in `input_snapshot` for
 * audit + replay. Full EngineInput would balloon the jsonb — recent
 * sessions and form-checks can be large arrays. Keep what's needed to
 * reconstruct the decision; drop verbose history.
 */
function buildInputSnapshot(input: EngineInput): Json {
  return {
    member_id: input.memberId,
    now: input.now.toISOString(),
    reading: input.latestReading
      ? {
          measured_at: input.latestReading.measuredAt,
          warm_up_state: input.latestReading.warmUpState,
          readiness_bucket: input.latestReading.readinessBucket,
          is_sick: input.latestReading.isSick,
        }
      : null,
    very_low_days_last_5: input.veryLowDaysLast5,
    rpe_drift_last_14d: input.rpeDriftLast14d,
    lifestyle: {
      sleep_hours_avg_2d: input.lifestyle.sleepHoursAvg2d,
      alcohol_last_2d: input.lifestyle.alcoholLast2d,
      feeling_last_3d: input.lifestyle.feelingLast3d,
    },
    recent_sessions_summary: input.recentSessions.map((s) => ({
      status: s.status,
      top_set_rpe_avg: s.topSetRpeAvg,
      top_set_target_rpe_avg: s.topSetTargetRpeAvg,
    })),
    recent_form_check_count: input.recentFormChecks.length,
    days_since_heavy_lift: input.daysSinceHeavyLift,
    next_session: input.nextSession
      ? {
          session_id: input.nextSession.sessionId,
          scheduled_for: input.nextSession.scheduledFor,
          title: input.nextSession.title,
          week: input.nextSession.week,
          exercise_count: input.nextSession.exercises.length,
        }
      : null,
  } as unknown as Json;
}

/**
 * Build the row to insert into hrv_session_modifiers. Pure function —
 * no DB access. Returns the shape Supabase's `from(...).insert(...)`
 * expects.
 */
export function buildModifierRow(
  decision: CandidateDecision,
  context: PersistContext,
  input: EngineInput,
  refinement: ReasoningRefinement | null
): Database["public"]["Tables"]["hrv_session_modifiers"]["Insert"] {
  const params = refinement?.paramsOverride ?? decision.params;
  const explanation = refinement?.explanationDa ?? decision.explanationDa;
  const confidence = refinement?.confidence ?? decision.confidence;
  const humanReview =
    refinement?.humanReviewRecommended ?? decision.humanReviewRecommended;

  const escalating = shouldEscalate(decision.action, humanReview);

  return {
    member_id: context.memberId,
    session_id: context.sessionId,
    program_id: context.programId,
    modifier_type: decision.action,
    reason: "adaptive_v0",
    applied_value: (params as unknown as Json) ?? null,
    accepted_by_member: null,
    input_snapshot: buildInputSnapshot(input),
    rule_decision: {
      action: decision.action,
      confidence: decision.confidence,
      reasons: decision.reasons,
      params: decision.params,
      human_review_recommended: decision.humanReviewRecommended,
      explanation_da: decision.explanationDa,
    } as unknown as Json,
    reasoning_output: refinement?.rawOutput ?? null,
    explanation_da: explanation,
    confidence,
    // Auto-sign-off only when not escalating; escalating rows wait for
    // Munk (or a co-coach) to fill reviewed_by + reviewed_at.
    reviewed_by: escalating ? null : "auto",
    reviewed_at: escalating ? null : new Date().toISOString(),
  };
}

/**
 * Build the matching hrv_alerts row when a modifier escalates.
 * The conditions_met jsonb carries everything Munk needs in his queue
 * UI without having to join back to the modifier (faster render).
 */
export function buildAlertRow(
  decision: CandidateDecision,
  context: PersistContext,
  refinement: ReasoningRefinement | null,
  modifierId: string,
  now: Date
): Database["public"]["Tables"]["hrv_alerts"]["Insert"] {
  const explanation = refinement?.explanationDa ?? decision.explanationDa;
  const confidence = refinement?.confidence ?? decision.confidence;

  return {
    member_id: context.memberId,
    triggered_at: now.toISOString(),
    session_modifier_id: modifierId,
    conditions_met: {
      source: "adaptive_v0",
      action: decision.action,
      confidence,
      reasons: decision.reasons,
      explanation_da: explanation,
      session_id: context.sessionId,
    } as unknown as Json,
  };
}

/**
 * Persist a single adaptation decision for one member + one session.
 *
 * Caller (the cron handler) is responsible for the per-member try/catch
 * so one member's failure doesn't abort the batch. This function throws
 * on any unexpected DB error and returns a structured result on success.
 */
export async function persistAdaptation(args: {
  supabase: SupabaseClient<Database>;
  decision: CandidateDecision;
  input: EngineInput;
  context: PersistContext;
  refinement?: ReasoningRefinement | null;
  now: Date;
}): Promise<PersistResult> {
  const { supabase, decision, input, context, refinement = null, now } = args;

  // Short-circuit: no_change is not persisted at all.
  if (decision.action === "no_change") {
    return { skipped: true, reason: "no_action" };
  }

  // Idempotency: at most one adaptive_v0 row per (member, session).
  const { data: existing, error: existingErr } = await supabase
    .from("hrv_session_modifiers")
    .select("id")
    .eq("member_id", context.memberId)
    .eq("session_id", context.sessionId)
    .eq("reason", "adaptive_v0")
    .limit(1)
    .maybeSingle();
  if (existingErr) {
    throw new Error(`persistAdaptation idempotency check: ${existingErr.message}`);
  }
  if (existing) {
    return { skipped: true, reason: "duplicate", modifierId: existing.id as string };
  }

  // Insert the modifier.
  const modifierRow = buildModifierRow(decision, context, input, refinement);
  const { data: modifierInserted, error: modErr } = await supabase
    .from("hrv_session_modifiers")
    .insert(modifierRow)
    .select("id")
    .single();
  if (modErr || !modifierInserted) {
    throw new Error(
      `persistAdaptation modifier insert: ${modErr?.message ?? "no row returned"}`
    );
  }
  const modifierId = modifierInserted.id as string;

  // Decide whether to insert the matching alert.
  const humanReview =
    refinement?.humanReviewRecommended ?? decision.humanReviewRecommended;
  if (!shouldEscalate(decision.action, humanReview)) {
    return { skipped: false, modifierId, alertId: null };
  }

  // Alert insert. Failure here is logged but does not undo the modifier:
  // the member-facing UI already shows the placeholder, and stale
  // escalations are caught by the ops dashboard.
  const alertRow = buildAlertRow(decision, context, refinement, modifierId, now);
  const { data: alertInserted, error: alertErr } = await supabase
    .from("hrv_alerts")
    .insert(alertRow)
    .select("id")
    .single();
  if (alertErr || !alertInserted) {
    console.error(
      "[adaptive/persist] alert insert failed for modifier",
      modifierId,
      alertErr?.message ?? "no row returned"
    );
    return { skipped: false, modifierId, alertId: null };
  }

  return {
    skipped: false,
    modifierId,
    alertId: alertInserted.id as string,
  };
}
