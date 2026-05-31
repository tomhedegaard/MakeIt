/**
 * Crew Coaching Pyramid — co-coach auto-assignment (CC-5).
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §7
 *
 * Pure: no DB, no React. The promoteToLiveAction picks 2-3 members
 * from the roster as the new co-coach's assigned members via this
 * helper, then inserts co_coach_assignments rows.
 *
 * v0 simplification: deterministic-but-shuffled pick, not yet
 * complementarity-scored. The spec calls for "members chosen by
 * complementarity to Beast's training history" — that arrives in
 * CC-5b once we add a training-history join in the data fetcher.
 * The current v0 is honest: stable, testable, fair across re-runs,
 * and explicitly documented.
 *
 * Determinism: sort by FNV-1a hash of `${beastId}:${memberId}` so the
 * SAME (beast, roster, already-assigned) input always picks the same
 * members. This lets the action and the tests agree.
 */

/** Lightweight deterministic string hash (FNV-1a, 32-bit). */
function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface PickInput {
  /** Candidate member ids — typically the full non-coach roster at the Beast's tier. */
  roster: string[];
  /** The Beast being promoted (excluded from their own assigned set). */
  beastId: string;
  /** Members already assigned to any active co-coach assignment — excluded. */
  alreadyAssigned: Set<string>;
  /** How many to pick. Spec: 2-3. */
  count: number;
}

/**
 * Pick `count` eligible members for a freshly-promoted Beast.
 * Returns ≤count ids (fewer when the eligible pool is smaller).
 */
export function pickMembersForCoCoach(input: PickInput): string[] {
  if (input.count <= 0) return [];

  const eligible = input.roster.filter(
    (id) => id !== input.beastId && !input.alreadyAssigned.has(id),
  );

  // Deterministic ordering keyed by the Beast — same Beast always
  // gets the same priority over the same eligible pool, while two
  // different Beasts see different orderings.
  const sorted = [...eligible].sort((a, b) => {
    const ha = fnv1a(`${input.beastId}:${a}`);
    const hb = fnv1a(`${input.beastId}:${b}`);
    if (ha !== hb) return ha - hb;
    // Tie-break by id so the ordering is total and stable.
    return a.localeCompare(b);
  });

  return sorted.slice(0, input.count);
}
