/**
 * Crew Coaching Pyramid — buddy matching engine (CC-2).
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §5
 *
 * Pure: no DB, no React. The cron (CC-2's route) fetches feature
 * vectors per member and calls assignBuddiesForTier; the result feeds
 * straight into buddy_pairs inserts.
 *
 * Algorithm (v0):
 *   1. Hard-filter pairs that violate language or timezone (±2h).
 *   2. Score every valid pair on five complementarity factors.
 *   3. Greedy match: sort candidates by score descending, lock the
 *      highest scoring pair, repeat until the pool is exhausted.
 *
 * The five factors are chosen to match the spec's "complementarity not
 * similarity" stance:
 *   - engagement_balance: pair "gaining momentum" with "stable" — one
 *     pulls forward, one holds steady.
 *   - training_phase_offset: your heavy week is your buddy's deload —
 *     different demand windows encourage mutual support.
 *   - goal_focus_alignment: cross-goal pairs report higher accountability
 *     in the buddy-coaching literature (per spec).
 *   - hrv_pattern_complement: an oscillator paired with a flat profile
 *     is a stabilising match.
 *   - session_frequency_match: similar weekly cadence keeps the buddy
 *     experience parallel (you both train often, or you both train less).
 *
 * Weights are calibrated v0 — total possible score is 100, max factor
 * 30 (engagement). Tune via the spec §5 quality target (>60% of pairs
 * sending ≥1 interaction/week).
 */

/** Algorithm version stamped into pairing_reason for forensic replay. */
export const PAIRING_ALGO_VERSION = "v0";

/* ---------------- enums ---------------- */

export type HrvPattern = "flat" | "improving" | "oscillating" | "unknown";
export type RepsTrajectory = "gaining" | "stable" | "declining" | "unknown";
export type GoalFocus = "strength" | "hypertrophy" | "hybrid" | "unknown";
export type BuddyTier = "athlete" | "beast" | "legend";
export type BuddyLanguage = "da" | "en";

/* ---------------- shapes ---------------- */

/**
 * Member feature vector consumed by the matcher. The data fetcher
 * (CC-2's pairing-data layer) shapes these from members + hrv +
 * sessions + reps tables. timezoneOffsetHours is pre-resolved
 * (Intl-derived) so the matcher stays pure and timezone-library-free.
 */
export interface MemberFeatures {
  memberId: string;
  language: BuddyLanguage;
  /** Resolved IANA timezone → UTC offset hours at "now". */
  timezoneOffsetHours: number;
  /** Program week mod 4 (0..3); 0 typically deload, but capture
   *  the deload flag separately so the proxy can be refined later. */
  trainingWeekMod4: number;
  deload: boolean;
  hrvPattern: HrvPattern;
  goalFocus: GoalFocus;
  /** Sessions completed in the last 30 days. */
  sessionsPer30d: number;
  repsTrajectory: RepsTrajectory;
}

/** Pair output shape — member_a < member_b for the buddy_pairs unique constraint. */
export interface PairProposal {
  memberA: string;
  memberB: string;
  pairingReason: {
    algo_version: string;
    score: number;
    /** Top three factor codes ranked by individual score. */
    top_factors: string[];
  };
}

/* ---------------- scoring helpers (exported for unit testing) ---------------- */

export function engagementComplementScore(
  a: RepsTrajectory,
  b: RepsTrajectory,
): number {
  if (a === "unknown" || b === "unknown") return 10;
  const set = new Set([a, b]);
  if (set.has("gaining") && set.has("stable")) return 30;
  if (set.has("declining") && set.has("stable")) return 25;
  if (set.has("gaining") && set.has("declining")) return 15;
  // Same direction.
  if (a === "stable") return 15;
  if (a === "gaining") return 10;
  return 5; // declining + declining — downward-spiral risk.
}

export function trainingPhaseOffsetScore(
  a: Pick<MemberFeatures, "trainingWeekMod4" | "deload">,
  b: Pick<MemberFeatures, "trainingWeekMod4" | "deload">,
): number {
  // Minimal cyclic distance on a 4-week cycle: 0..2.
  const raw = Math.abs(a.trainingWeekMod4 - b.trainingWeekMod4) % 4;
  const cyclic = Math.min(raw, 4 - raw);
  // 0 → 10, 1 → 15, 2 → 20 (max offset = ideal complementarity).
  const base = cyclic === 0 ? 10 : cyclic === 1 ? 15 : 20;
  // Deload XOR — one off, one on → +5.
  const xor = a.deload !== b.deload ? 5 : 0;
  return Math.min(20, base + xor);
}

export function goalFocusScore(a: GoalFocus, b: GoalFocus): number {
  if (a === "unknown" || b === "unknown") return 5;
  return a === b ? 10 : 15; // cross-goal pairs preferred per spec.
}

export function hrvPatternScore(a: HrvPattern, b: HrvPattern): number {
  if (a === "unknown" && b === "unknown") return 0;
  if (a === "unknown" || b === "unknown") return 5;
  const set = new Set([a, b]);
  // Oscillator stabilised by a flat / improving partner.
  if (set.has("oscillating") && (set.has("flat") || set.has("improving"))) {
    return 15;
  }
  // Two improvers — supportive.
  if (a === "improving" && b === "improving") return 12;
  // Same flat — fine but unremarkable.
  return 5;
}

export function sessionFrequencyScore(a: number, b: number): number {
  const diff = Math.abs(a - b);
  if (diff <= 1) return 20;
  if (diff <= 2) return 15;
  if (diff <= 3) return 10;
  return 5;
}

/* ---------------- pair scorer ---------------- */

interface ScoredFactor {
  name: string;
  score: number;
}

interface ScoredPair {
  a: MemberFeatures;
  b: MemberFeatures;
  total: number;
  factors: ScoredFactor[];
}

/**
 * Score one valid pair. Returns null when a hard constraint is violated
 * (different languages OR timezone offset > 2h). Callers filter on
 * non-null and pick the best by total.
 */
export function scorePair(
  a: MemberFeatures,
  b: MemberFeatures,
): ScoredPair | null {
  if (a.language !== b.language) return null;
  if (Math.abs(a.timezoneOffsetHours - b.timezoneOffsetHours) > 2) return null;

  const factors: ScoredFactor[] = [
    {
      name: "engagement_balance",
      score: engagementComplementScore(a.repsTrajectory, b.repsTrajectory),
    },
    {
      name: "training_phase_offset",
      score: trainingPhaseOffsetScore(a, b),
    },
    {
      name: "goal_focus_alignment",
      score: goalFocusScore(a.goalFocus, b.goalFocus),
    },
    {
      name: "hrv_pattern_complement",
      score: hrvPatternScore(a.hrvPattern, b.hrvPattern),
    },
    {
      name: "session_frequency_match",
      score: sessionFrequencyScore(a.sessionsPer30d, b.sessionsPer30d),
    },
  ];
  const total = factors.reduce((s, f) => s + f.score, 0);
  return { a, b, total, factors };
}

/* ---------------- greedy matcher ---------------- */

/**
 * Assign buddies for a tier-scoped pool.
 *
 * The pool must already be filtered to one tier with no active pair
 * (the data fetcher's job). Members already paired stay un-touched.
 *
 * For N members we return ⌊N/2⌋ pairs; an odd member is left
 * un-paired this cycle (next cron tick re-tries). Hard-incompatible
 * members (no valid partner) are also left un-paired silently.
 *
 * Deterministic on same input: pairs are sorted by total score
 * descending, then by concatenated member IDs ascending as tie-break.
 */
export function assignBuddiesForTier(
  pool: MemberFeatures[],
): PairProposal[] {
  if (pool.length < 2) return [];

  // Cartesian over unordered pairs.
  const candidates: ScoredPair[] = [];
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const scored = scorePair(pool[i], pool[j]);
      if (scored) candidates.push(scored);
    }
  }

  // Highest score first; deterministic tie-break by joined ids.
  candidates.sort((x, y) => {
    if (y.total !== x.total) return y.total - x.total;
    const xKey = pairKey(x.a.memberId, x.b.memberId);
    const yKey = pairKey(y.a.memberId, y.b.memberId);
    return xKey.localeCompare(yKey);
  });

  const used = new Set<string>();
  const proposals: PairProposal[] = [];
  for (const c of candidates) {
    if (used.has(c.a.memberId) || used.has(c.b.memberId)) continue;
    used.add(c.a.memberId);
    used.add(c.b.memberId);

    const [lo, hi] = c.a.memberId < c.b.memberId ? [c.a, c.b] : [c.b, c.a];
    const topFactors = [...c.factors]
      .sort((x, y) => y.score - x.score)
      .slice(0, 3)
      .map((f) => f.name);

    proposals.push({
      memberA: lo.memberId,
      memberB: hi.memberId,
      pairingReason: {
        algo_version: PAIRING_ALGO_VERSION,
        score: c.total,
        top_factors: topFactors,
      },
    });
  }
  return proposals;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}
