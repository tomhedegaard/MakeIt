/**
 * Character-overlap heuristic for the Munk Multiplier draft-reply flow
 * (spec docs/superpowers/specs/2026-05-26-munk-multiplier-v0-design.md).
 *
 * When Munk sends a form-check reply that started from Claude's
 * `ai_drafted_reply`, we want to know how much of the draft survived.
 * Two consumers share this one metric so they never disagree:
 *
 *   - server: `drafted_by_ai = overlap >= DRAFT_OVERLAP_THRESHOLD`
 *     (spec §MM-2: "kept ≥70% character overlap with the draft")
 *   - client telemetry: `edit_ratio = 1 - overlap` on
 *     `coach_draft_reply_sent` (spec §8 voice-fidelity dashboard)
 *
 * Overlap is normalised Levenshtein similarity against the longer
 * string: 1 - editDistance / max(len). Symmetric, and additions count
 * as divergence (appending a paragraph to the draft lowers overlap),
 * which is the behaviour we want — a heavily-expanded reply is Munk's,
 * not the model's.
 */

export const DRAFT_OVERLAP_THRESHOLD = 0.7;

/** Levenshtein edit distance with an O(min(n,m)) rolling buffer. */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Keep the shorter string as the inner (column) dimension.
  if (a.length > b.length) [a, b] = [b, a];

  let prev = Array.from({ length: a.length + 1 }, (_, i) => i);
  let curr = new Array<number>(a.length + 1);

  for (let j = 1; j <= b.length; j++) {
    curr[0] = j;
    const bj = b.charCodeAt(j - 1);
    for (let i = 1; i <= a.length; i++) {
      const cost = a.charCodeAt(i - 1) === bj ? 0 : 1;
      curr[i] = Math.min(
        prev[i] + 1, // deletion
        curr[i - 1] + 1, // insertion
        prev[i - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[a.length];
}

/**
 * Fraction of the draft preserved in the sent text, 0..1. Returns 1
 * when both strings are empty (degenerate) and 0 when exactly one is.
 */
export function draftOverlapRatio(draft: string, sent: string): number {
  const maxLen = Math.max(draft.length, sent.length);
  if (maxLen === 0) return 1;
  return 1 - editDistance(draft, sent) / maxLen;
}

/**
 * Whether a sent reply should be flagged `drafted_by_ai`: there was a
 * non-empty draft, the coach sent non-empty text, and enough of the
 * draft survived. A blank draft or blank send is always false.
 */
export function draftedByAi(
  draft: string | null | undefined,
  sent: string
): boolean {
  if (!draft || !sent) return false;
  return draftOverlapRatio(draft, sent) >= DRAFT_OVERLAP_THRESHOLD;
}
