/**
 * Crisis keyword pre-filter — fast regex over journal body + AI output
 * BEFORE we round-trip to Claude moderation. Conservative by design:
 * false positives surface the resources modal (which is helpful, not
 * harmful), false negatives don't.
 *
 * Spec: docs/superpowers/specs/2026-06-07-mental-health-pillar-v0-design.md §11
 *
 * Categories:
 *   self_harm — explicit self-harm intent or recent action
 *   suicidal  — suicidal ideation
 *   severe    — severe distress / hopelessness without specific intent
 *   substance — substance crisis
 *
 * Hardened in MH-9 with Claude moderation; this layer is the fast path.
 */

export type CrisisCategory = "self_harm" | "suicidal" | "severe" | "substance";

interface KeywordRule {
  category: CrisisCategory;
  pattern: RegExp;
}

// Danish primary; English secondary. We can't rely on ASCII `\b` for
// Danish (ø/æ/å aren't word chars), so patterns use lookarounds on
// whitespace/punctuation/edges. Case-insensitive. Designed for
// short-form journal entries.
const E = "(?:^|[^a-zæøåA-ZÆØÅ0-9])";   // left edge
const X = "(?:$|[^a-zæøåA-ZÆØÅ0-9])";   // right edge

function rule(category: CrisisCategory, words: string[]): KeywordRule {
  const alt = words.join("|");
  return {
    category,
    pattern: new RegExp(`${E}(${alt})${X}`, "i"),
  };
}

const RULES: KeywordRule[] = [
  // Self-harm
  rule("self_harm", [
    "skære i mig selv", "skære sig", "cutting", "self.?harm",
    "skade mig selv", "jeg vil skade",
  ]),
  // Suicidal — Danish + English
  rule("suicidal", [
    "tage mit liv", "tage mit eget liv", "vil dø", "ønsker at dø", "gå hen og dø",
    "slå mig selv ihjel", "begå selvmord", "selvmord",
    "kill myself", "end it all", "want to die", "suicide", "suicidal",
  ]),
  // Severe distress
  rule("severe", [
    "kan ikke mere", "orker ikke mere", "håbløst", "håbløs",
    "ingen grund til at leve", "ingen mening i livet",
    "no reason to live", "cant go on", "can't go on", "hopeless",
  ]),
  // Substance crisis
  rule("substance", [
    "overdose", "overdosering", "drikker mig fuld hver dag",
  ]),
];

export interface CrisisFlag {
  isCrisis: boolean;
  categories: CrisisCategory[];
  matches: string[];
}

/**
 * Scan text for crisis keywords. Returns the categories matched plus
 * the literal substrings that triggered them (for telemetry only; we
 * never persist matches against the journal row).
 */
export function detectCrisisKeywords(text: string): CrisisFlag {
  const lower = text.toLowerCase();
  const categories = new Set<CrisisCategory>();
  const matches: string[] = [];

  for (const rule of RULES) {
    const m = lower.match(rule.pattern);
    if (m) {
      categories.add(rule.category);
      matches.push(m[0]);
    }
  }

  return {
    isCrisis: categories.size > 0,
    categories: Array.from(categories),
    matches,
  };
}
