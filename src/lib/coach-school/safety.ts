/**
 * Crew Coaching Pyramid — safety / moderation primitives (CC-9).
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §9
 *
 * Two safety rails for outgoing co-coach messages (the `reasoning`
 * text attached to sandbox + live review submissions):
 *
 *   1. Pure injury-keyword detector — Danish-first list. Cheap,
 *      deterministic, runs first so we never spend Claude tokens on
 *      obvious "smerte"-mentions.
 *   2. Claude moderation — flags { medical_claim, injury_advice,
 *      demotivating_tone, off_topic_promotion }. Lives in the
 *      moderation-claude.ts wrapper.
 *
 * `shouldModerate(coachTier)` decides who's gated. v0 simplification:
 * we moderate ALL beasts (sandbox + live) without the spec's 30-day
 * post-promotion cutoff. Reasons:
 *   - We don't track a `promoted_to_live_at` column yet (would need
 *     another migration). Cohort is small enough that "always
 *     moderate beasts" is honest + safer than a buggy cutoff.
 *   - Munk and legend_live bypass moderation (the spec treats
 *     Legends as senior Beasts and Munk as ground truth).
 *
 * Everything in this module is pure (no DB, no Anthropic SDK). The
 * Claude wrapper imports the schema + category union from here.
 */

/** v0 Danish keyword list for the cheap pre-Claude injury check.
 *  Order matters — first match wins (so we surface the most
 *  alarming token). Whole-word and substring forms both included
 *  to catch "smerter", "rygsmerter", etc. */
export const INJURY_KEYWORDS_DA: readonly string[] = [
  "smerte",
  "ondt i",
  "kan ikke bøje",
  "kan ikke løfte",
  "skadet",
  "skade",
  "rygsmerter",
  "knæsmerter",
  "skuldersmerter",
] as const;

export interface InjuryHit {
  hit: boolean;
  /** The first matching keyword in lowercase form, or null. */
  keyword: string | null;
}

/** Case-insensitive substring match against INJURY_KEYWORDS_DA.
 *  Returns the first hit (most "alarming" word wins by ordering). */
export function detectInjuryKeywords(text: string | null | undefined): InjuryHit {
  if (!text) return { hit: false, keyword: null };
  const haystack = text.toLowerCase();
  for (const kw of INJURY_KEYWORDS_DA) {
    if (haystack.includes(kw)) {
      return { hit: true, keyword: kw };
    }
  }
  return { hit: false, keyword: null };
}

/** Coach tiers that trigger moderation on every outgoing message. */
const MODERATED_TIERS = new Set(["beast_sandbox", "beast_live"]);

/** Pure tier-gate. Returns true when this caller's outgoing messages
 *  must pass safety checks. v0: beasts always; munk + legend_live skip. */
export function shouldModerate(coachTier: string | null | undefined): boolean {
  return !!coachTier && MODERATED_TIERS.has(coachTier);
}

/* ------------------------------------------------------------------ *
 * Claude moderation — categories + schema (shared with wrapper)
 * ------------------------------------------------------------------ */

export const SAFETY_CATEGORIES = [
  "medical_claim",
  "injury_advice",
  "demotivating_tone",
  "off_topic_promotion",
] as const;
export type SafetyCategory = (typeof SAFETY_CATEGORIES)[number];

export function isSafetyCategory(s: string): s is SafetyCategory {
  return (SAFETY_CATEGORIES as readonly string[]).includes(s);
}

/** What the safety pipeline reports back to the action layer. */
export interface SafetyVerdict {
  held: boolean;
  /** Set when held=true. Either an injury keyword (string) or a
   *  Claude SafetyCategory. */
  reason:
    | { kind: "injury_keyword"; keyword: string }
    | { kind: "moderation_category"; category: SafetyCategory; explanation: string }
    | null;
}

/** Pretty-print a verdict reason for telemetry / UI strings. */
export function describeVerdictReason(v: SafetyVerdict): string {
  if (!v.held || !v.reason) return "ok";
  if (v.reason.kind === "injury_keyword") {
    return `injury:${v.reason.keyword}`;
  }
  return `moderation:${v.reason.category}`;
}
