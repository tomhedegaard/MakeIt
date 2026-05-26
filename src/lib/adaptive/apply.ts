/**
 * Adaptive Program Engine — apply a persisted modifier to a Session.
 *
 * Spec: docs/superpowers/specs/2026-05-25-adaptive-program-engine-v0-design.md §6
 *
 * Pure transformation. Takes the canonical Session (as built by
 * `getFullSession`) and an active `hrv_session_modifiers` row, and
 * returns a new Session with adaptive markers attached. SessionClient
 * reads those markers and renders subtle visual cues (badges, reduced
 * opacity, replacement block).
 *
 * Conventions used by this layer:
 *   - `session.exercises[0]` is the main lift (position=1 in DB)
 *   - `session.exercises[0].sets[0]` is the top set (position=1 in DB)
 *   - Accessory exercises are `exercises[1..]`
 *
 * The data layer (`getFullSession`) already sorts both arrays by
 * position ascending, so these index-based conventions are stable.
 *
 * Defensive: if the adaptation references a session shape the caller
 * doesn't have (e.g. an action with `accessorySetsDropped: 3` but the
 * session only has 2 accessory exercises), we degrade gracefully
 * rather than crashing — apply what we can and leave the rest alone.
 *
 * The function never mutates the input — input is structurally cloned
 * before modification so callers can keep using the original.
 */

import type { ActiveAdaptation } from "./explanation";
import type { Session } from "@/lib/workout";

/** What top_set_reduction looks like in applied_value jsonb. */
interface TopSetReductionParams {
  percent?: number;
}

/** What volume_reduction looks like in applied_value jsonb. */
interface VolumeReductionParams {
  accessorySetsDropped?: number;
}

/** What exercise_swap_variant looks like in applied_value jsonb. */
interface SwapParams {
  fromExerciseId?: string;
  toExerciseId?: string;
  variantReason?:
    | "joint_friendly"
    | "unilateral"
    | "low_cns"
    | "time_efficient";
}

/**
 * Apply the active adaptation to the session. Always returns a new
 * Session — input is not mutated. If adaptation is null, returns the
 * input session as-is (still cloned for caller-safety symmetry).
 */
export function applyAdaptationToSession(
  session: Session,
  adaptation: ActiveAdaptation | null
): Session {
  const clone = structuredClone(session);
  if (!adaptation) return clone;

  // If the modifier is escalating and still pending Munk, don't yet
  // transform the session — the card carries the message and Munk
  // hasn't signed off on the change. The member sees the pending
  // attribution but their plan stays put.
  const pendingCoach =
    adaptation.reviewedBy === null &&
    (adaptation.modifierType === "paused_session" ||
      adaptation.modifierType === "deload_week_insertion" ||
      adaptation.modifierType === "escalate_to_coach");
  if (pendingCoach) return clone;

  // If the member has explicitly kept the original (accept = false),
  // don't apply.
  if (adaptation.acceptedByMember === false) return clone;

  // Params come from hrv_session_modifiers.applied_value jsonb. The
  // persist layer normalises them to camelCase before insert, so we
  // expect camelCase here too.
  const params = (adaptation.params ?? {}) as Record<string, unknown>;

  switch (adaptation.modifierType) {
    case "top_set_reduction":
      return applyTopSetReduction(clone, params as TopSetReductionParams);
    case "volume_reduction":
      return applyVolumeReduction(clone, params as VolumeReductionParams);
    case "session_shorten":
      return applySessionShorten(clone);
    case "exercise_swap_variant":
      return applySwapSuggestion(clone, params as SwapParams);
    case "paused_session":
      return applyPaused(clone);
    case "deload_week_insertion":
    case "escalate_to_coach":
      // These don't transform today's session — the card carries the
      // message and the change lands in a future session.
      return clone;
    case "no_change":
      return clone;
  }
}

function applyTopSetReduction(
  session: Session,
  params: TopSetReductionParams
): Session {
  const percent = params.percent;
  if (!percent || percent <= 0 || percent > 50) return session;

  const main = session.exercises[0];
  if (!main || main.sets.length === 0) return session;

  const topSet = main.sets[0];
  const originalWeight = topSet.targetWeight;
  const newWeight = roundTo25(originalWeight * (1 - percent / 100));

  topSet.targetWeight = newWeight;
  topSet.adapted = {
    kind: "weight_reduced",
    originalWeight,
    percent,
  };
  return session;
}

function applyVolumeReduction(
  session: Session,
  params: VolumeReductionParams
): Session {
  const count = params.accessorySetsDropped;
  if (!count || count <= 0) return session;

  // Walk accessory exercises (index ≥ 1) from the end of the session
  // backward, marking the last N sets across all accessory exercises
  // as optional. Members are most likely to accept dropping the
  // *last* sets they'd do, not the first.
  const accessorySets: { exIdx: number; setIdx: number }[] = [];
  for (let exIdx = session.exercises.length - 1; exIdx >= 1; exIdx--) {
    const ex = session.exercises[exIdx];
    for (let setIdx = ex.sets.length - 1; setIdx >= 0; setIdx--) {
      accessorySets.push({ exIdx, setIdx });
    }
  }

  for (let i = 0; i < Math.min(count, accessorySets.length); i++) {
    const { exIdx, setIdx } = accessorySets[i];
    session.exercises[exIdx].sets[setIdx].optional = true;
  }
  return session;
}

function applySessionShorten(session: Session): Session {
  // Mark all accessory exercises (index ≥ 1) as optional. Main lift
  // (index 0) is preserved — it's the anchor of the session.
  for (let i = 1; i < session.exercises.length; i++) {
    session.exercises[i].optional = true;
  }
  return session;
}

function applySwapSuggestion(session: Session, params: SwapParams): Session {
  // v0: don't actually swap — just hint. Real swap (replacing name +
  // cue + library) requires fetching the target exercise's details
  // and lands in a follow-up slice. The card already says we've
  // swapped; this marker lets SessionClient surface a quieter
  // "Coach foreslår en lettere variant" line above the main exercise.
  const main = session.exercises[0];
  if (!main) return session;
  main.adapted = {
    kind: "swap_suggested",
    variantReason: params.variantReason ?? "joint_friendly",
  };
  return session;
}

function applyPaused(session: Session): Session {
  session.pausedReplacement = {
    title: "Restitution i dag",
    body:
      "Din krop har brug for at lade op. 10 min mobilitet + 20 min rolig gåtur " +
      "udenfor. Træk vejret. Vi ses i morgen.",
  };
  return session;
}

/** Mirror of the rounding rule used by program-generator-claude. */
function roundTo25(n: number): number {
  return Math.round(n / 2.5) * 2.5;
}
