/**
 * Adaptive Program Engine — pure rule layer.
 *
 * Spec: docs/superpowers/specs/2026-05-25-adaptive-program-engine-v0-design.md §4
 *
 * The rule layer is deterministic, side-effect-free, and runs in <10ms
 * per member. It consumes a frozen `EngineInput` snapshot (built by the
 * data-layer wrapper) and produces a `CandidateDecision`. The data layer
 * then either (a) persists the decision verbatim if confidence is high
 * and no human review is recommended, or (b) hands the decision off to
 * the Claude reasoning layer for refinement.
 *
 * Design principles:
 *   - Conservative. Most days return no_change. We'd rather under-adapt
 *     and let Munk add interventions than over-adapt and damage trust.
 *   - One action per session. Rules are evaluated in priority order and
 *     the first match wins. No combinations.
 *   - All decisions explainable. Every non-trivial action carries 1-3
 *     reason codes used both for telemetry and for rendering the
 *     "Why today is different" UI.
 *   - Hard escalations. paused_session, deload_week_insertion, and
 *     escalate_to_coach always set humanReviewRecommended=true so Munk
 *     sees them in his queue before they surface to the member.
 *
 * This mirrors the established `src/lib/hrv/nudge.ts` pattern: pure
 * decision function, injected `now: Date` for tests, no Supabase access.
 */

import type {
  CandidateDecision,
  EngineInput,
  RuleReasonCode,
} from "./types";

/** Maximum age of an HRV reading before the engine treats it as stale. */
const MAX_READING_AGE_MS = 36 * 60 * 60 * 1000;

/** Minimum hours of sleep (avg last 2 days) below which we flag low_sleep. */
const LOW_SLEEP_THRESHOLD_HOURS = 5.5;

/** RPE-drift threshold (14-day average of logged-target) for sustained-low. */
const RPE_DRIFT_DELOAD_THRESHOLD = 1.5;

/** Single-session RPE overshoot (last session's avg) for rpe_overshoot signal. */
const RPE_OVERSHOOT_THRESHOLD = 1.0;

/** Count of missed sessions in last 3 to trigger missed_sessions signal. */
const MISSED_SESSIONS_THRESHOLD = 2;

/** Form-check score below which a main lift swap becomes eligible. */
const FORM_CHECK_CONCERN_THRESHOLD = 6;

/** Subjective feeling states that count as low_feeling signal. */
const LOW_FEELING_STATES = new Set(["tired", "stressed"]);

/**
 * Evaluate the rule layer for one member at one moment.
 *
 * Returns a `CandidateDecision`. The caller is responsible for:
 *   - Deciding whether to invoke the reasoning layer (typically when
 *     action !== no_change OR confidence is in a fuzzy band).
 *   - Persisting the decision as `hrv_session_modifiers`.
 *   - Mirroring escalations into `hrv_alerts` for Munk's queue.
 */
export function evaluateAdaptation(input: EngineInput): CandidateDecision {
  // -------------------------------------------------------------------
  // HARD EXITS — these always return no_change with high confidence.
  // -------------------------------------------------------------------

  if (!input.adaptiveProgramEnabled) {
    return noChange(["opt_out"], "Adaptiv tilpasning er slået fra.");
  }

  if (!input.nextSession) {
    return noChange(
      ["no_next_session"],
      "Ingen kommende session at tilpasse."
    );
  }

  if (!input.latestReading) {
    return noChange(
      ["no_reading"],
      "Ingen HRV-måling — kører dagens session uændret."
    );
  }

  // Reading must be ≤36h old.
  const ageMs =
    input.now.getTime() - new Date(input.latestReading.measuredAt).getTime();
  if (ageMs > MAX_READING_AGE_MS || ageMs < 0) {
    return noChange(
      ["stale_reading"],
      "Din HRV-måling er ikke frisk nok — kører dagens session uændret."
    );
  }

  // Baseline must be mature.
  if (input.latestReading.warmUpState !== "active") {
    return noChange(
      ["warmup_incomplete"],
      "Din HRV-baseline er endnu under opbygning — kører dagens session uændret."
    );
  }

  // -------------------------------------------------------------------
  // CRITICAL SIGNALS — high confidence, always escalate to Munk.
  // -------------------------------------------------------------------

  // Sickness marker → pause.
  if (input.latestReading.isSick) {
    return {
      action: "paused_session",
      confidence: 0.95,
      reasons: ["sick_marker"],
      params: {},
      humanReviewRecommended: true,
      explanationDa:
        "Du har markeret dig som syg — dagens session er erstattet med aktiv restitution. Munk får besked.",
    };
  }

  // Sustained low readiness or sustained RPE drift → deload escalation.
  const sustainedLowVeryLow = input.veryLowDaysLast5 >= 3;
  const sustainedRpeDrift =
    input.rpeDriftLast14d !== null &&
    input.rpeDriftLast14d >= RPE_DRIFT_DELOAD_THRESHOLD;
  if (sustainedLowVeryLow || sustainedRpeDrift) {
    const reasons: RuleReasonCode[] = ["sustained_low_readiness"];
    if (sustainedRpeDrift) reasons.push("rpe_drift_rising");
    return {
      action: "deload_week_insertion",
      confidence: 0.8,
      reasons,
      params: {},
      humanReviewRecommended: true,
      explanationDa:
        "Din krop har trukket læsset over en længere periode — Munk overvejer en deload-uge. Du hører fra ham.",
    };
  }

  // Acute very_low HRV → pause today.
  if (input.latestReading.readinessBucket === "very_low") {
    return {
      action: "paused_session",
      confidence: 0.9,
      reasons: ["hrv_very_low"],
      params: {},
      humanReviewRecommended: true,
      explanationDa:
        "Din HRV er meget lav i dag — dagens session er erstattet med 10 min mobilitet + gåtur. Munk får besked.",
    };
  }

  // -------------------------------------------------------------------
  // NON-CRITICAL SIGNALS — collect, then prioritize.
  // -------------------------------------------------------------------

  const signals = new Set<RuleReasonCode>();

  if (input.latestReading.readinessBucket === "low") signals.add("hrv_low");

  if (
    input.lifestyle.sleepHoursAvg2d !== null &&
    input.lifestyle.sleepHoursAvg2d < LOW_SLEEP_THRESHOLD_HOURS
  ) {
    signals.add("low_sleep");
  }
  if (input.lifestyle.alcoholLast2d) signals.add("recent_alcohol");
  if (
    input.lifestyle.feelingLast3d !== null &&
    LOW_FEELING_STATES.has(input.lifestyle.feelingLast3d)
  ) {
    signals.add("low_feeling");
  }

  // Last session's RPE overshoot (logged − target).
  const lastSession = input.recentSessions[input.recentSessions.length - 1];
  if (
    lastSession &&
    lastSession.topSetRpeAvg !== null &&
    lastSession.topSetTargetRpeAvg !== null &&
    lastSession.topSetRpeAvg - lastSession.topSetTargetRpeAvg >=
      RPE_OVERSHOOT_THRESHOLD
  ) {
    signals.add("rpe_overshoot");
  }

  // Missed sessions among the last three.
  const missedCount = input.recentSessions.filter(
    (s) => s.status === "skipped"
  ).length;
  if (missedCount >= MISSED_SESSIONS_THRESHOLD) signals.add("missed_sessions");

  // Form-check concern on the next session's main lift (position=1).
  const mainLift = input.nextSession.exercises.find((e) => e.position === 1);
  const mainLiftFormCheck = mainLift
    ? lookupRecentFormCheck(input, mainLift.exerciseId)
    : null;
  if (
    mainLiftFormCheck !== null &&
    mainLiftFormCheck < FORM_CHECK_CONCERN_THRESHOLD
  ) {
    signals.add("form_check_concern");
  }

  // -------------------------------------------------------------------
  // PRIORITIZED ACTIONS — first match wins.
  // -------------------------------------------------------------------

  // HRV low + form-check concern → swap to lighter variant, if available.
  if (signals.has("hrv_low") && signals.has("form_check_concern") && mainLift?.lighterVariant) {
    return {
      action: "exercise_swap_variant",
      confidence: 0.75,
      reasons: ["hrv_low", "form_check_concern"],
      params: {
        fromExerciseId: mainLift.exerciseId,
        toExerciseId: mainLift.lighterVariant.exerciseId,
        variantReason: mainLift.lighterVariant.variantReason,
      },
      humanReviewRecommended: false,
      explanationDa: `Din HRV er lav i dag og dit sidste form-check på ${mainLift.exerciseName} viste plads til forbedring — vi har byttet til en lettere variant. Du kan altid vise originalen.`,
    };
  }

  // HRV low + (low sleep OR alcohol OR low feeling) → top-set reduction.
  if (
    signals.has("hrv_low") &&
    (signals.has("low_sleep") ||
      signals.has("recent_alcohol") ||
      signals.has("low_feeling"))
  ) {
    const reasons: RuleReasonCode[] = ["hrv_low"];
    if (signals.has("low_sleep")) reasons.push("low_sleep");
    if (signals.has("recent_alcohol")) reasons.push("recent_alcohol");
    if (signals.has("low_feeling")) reasons.push("low_feeling");
    return {
      action: "top_set_reduction",
      confidence: 0.8,
      reasons,
      params: { percent: 10 },
      humanReviewRecommended: false,
      explanationDa: buildTopSetExplanation(reasons),
    };
  }

  // HRV low alone → mild volume reduction.
  if (signals.has("hrv_low")) {
    return {
      action: "volume_reduction",
      confidence: 0.7,
      reasons: ["hrv_low"],
      params: { accessorySetsDropped: 2 },
      humanReviewRecommended: false,
      explanationDa:
        "Din HRV er lav i dag — vi har droppet 2 accessory-sæt. Hovedløftene er uændret.",
    };
  }

  // RPE overshoot + missed sessions (normal HRV) → shorten today.
  if (signals.has("rpe_overshoot") && signals.has("missed_sessions")) {
    return {
      action: "session_shorten",
      confidence: 0.65,
      reasons: ["rpe_overshoot", "missed_sessions"],
      params: {},
      humanReviewRecommended: false,
      explanationDa:
        "Sidste session var hårdere end planlagt og du har misset et par dage — vi har markeret accessory-blokken som valgfri.",
    };
  }

  // Unusual combination (≥3 signals, none above triggered) → escalate.
  if (signals.size >= 3) {
    const escalationReasons: RuleReasonCode[] = [
      "unusual_signal_combination",
      ...signals,
    ];
    return {
      action: "escalate_to_coach",
      confidence: 0.5,
      reasons: escalationReasons.slice(0, 5),
      params: {},
      humanReviewRecommended: true,
      explanationDa:
        "Der er flere ting i spil i dag som vi gerne vil have Munk til at kigge på først. Du hører fra ham før din session.",
    };
  }

  // -------------------------------------------------------------------
  // DEFAULT — no actionable signals.
  // -------------------------------------------------------------------

  return noChange(
    ["no_actionable_signals"],
    "Alt ser fint ud — kør sessionen som planlagt."
  );
}

// =====================================================================
// Helpers
// =====================================================================

function noChange(
  reasons: RuleReasonCode[],
  explanationDa: string
): CandidateDecision {
  return {
    action: "no_change",
    confidence: reasons.includes("no_actionable_signals") ? 0.9 : 1.0,
    reasons,
    params: {},
    humanReviewRecommended: false,
    explanationDa,
  };
}

function lookupRecentFormCheck(
  input: EngineInput,
  exerciseId: string
): number | null {
  // Most recent form-check (by reviewedAt) for this exercise in the
  // last 7 days. The data-layer wrapper has already scoped the array.
  const matches = input.recentFormChecks
    .filter((fc) => fc.exerciseId === exerciseId)
    .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));
  return matches.length > 0 ? matches[0].score : null;
}

function buildTopSetExplanation(reasons: RuleReasonCode[]): string {
  // Build a 1-sentence Danish explanation citing the specific lifestyle
  // factor(s) that drove the decision. Kept under 280 chars for parity
  // with the reasoning layer's output ceiling.
  const factors: string[] = [];
  if (reasons.includes("low_sleep")) factors.push("kort søvn");
  if (reasons.includes("recent_alcohol")) factors.push("alkohol seneste dage");
  if (reasons.includes("low_feeling")) factors.push("lav energi");
  const factorText =
    factors.length === 1
      ? factors[0]
      : `${factors.slice(0, -1).join(", ")} og ${factors[factors.length - 1]}`;
  return `Din HRV er lav i dag, og ${factorText} ovenpå — vi har reduceret topsæt-vægten med 10%. Arbejdssæt og volumen er uændret.`;
}
