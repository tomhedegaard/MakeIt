/**
 * Pure moderation combiner — keyword pre-filter × Claude verdict.
 *
 * Extracted from the Claude wrapper so it can be unit-tested without
 * `server-only` / the Anthropic SDK. The wrapper still returns null
 * on any failure; this module decides what that means.
 *
 * Fail-closed: a missing Claude verdict is never "clean". Keyword
 * hits still win as crisis. Spec:
 * docs/superpowers/specs/2026-08-30-mental-crisis-pipeline-honesty.md
 */

export type CombinedModerationStatus = "clean" | "flagged" | "crisis";

export type ClaudeVerdictLike = {
  status: CombinedModerationStatus;
  categories?: readonly string[];
} | null;

/**
 * Resolve a final moderation status.
 *
 * Conservative: keyword crisis wins; Claude-null is flagged (Livslinien
 * modal still surfaces); any Claude flag wins over clean.
 */
export function combineModerationVerdicts(
  keywordIsCrisis: boolean,
  claude: ClaudeVerdictLike,
): CombinedModerationStatus {
  if (keywordIsCrisis) return "crisis";
  if (!claude) return "flagged";
  if (claude.status === "crisis") return "crisis";
  if (claude.status === "flagged") return "flagged";
  return "clean";
}

/** Persist a countable reason fragment when Claude did not return a verdict. */
export function claudeNullReasonFragment(): "claude:null" {
  return "claude:null";
}
