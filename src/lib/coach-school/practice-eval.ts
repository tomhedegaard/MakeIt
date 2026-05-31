/**
 * Crew Coaching Pyramid — practice-scenario eval (CC-6).
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §8
 *
 * Pure: zod schema, system prompt, user payload. The Anthropic-SDK
 * wrapper lives in practice-eval-claude.ts (lazy-loaded by the
 * server action so Turbopack stays on its happy path — matching the
 * draft-reply-claude / reasoning-claude pattern).
 *
 * Each coaching lesson ships a `practice_scenario` jsonb:
 *
 *   { prompt: "...", context?: "...", rubric_for_claude: "..." }
 *
 * The member writes a free-text response to `prompt`. Claude
 * evaluates the response against `rubric_for_claude` and returns:
 *
 *   - score:                'needs_work' | 'on_track' | 'strong'
 *   - feedback_da:           ≤280-char Danish line shown verbatim
 *   - specific_strength?:    optional sentence: what worked
 *   - specific_improvement?: optional sentence: what to sharpen
 *
 * The structured output is the contract — the wrapper returns null
 * on any failure, and the caller treats null as "evaluation
 * unavailable, save the response without an eval".
 */

import { z } from "zod";

export const PracticeEvalSchema = z.object({
  score: z.enum(["needs_work", "on_track", "strong"]),
  feedback_da: z.string().min(10).max(280),
  specific_strength: z.string().optional(),
  specific_improvement: z.string().optional(),
});

export type PracticeEvalOutput = z.infer<typeof PracticeEvalSchema>;

/** Caller-friendly type alias (eval = output for this v0). */
export type PracticeEval = PracticeEvalOutput;

export interface PracticeEvalInput {
  /** The lesson's rubric — describes what "strong" looks like. */
  rubric: string;
  /** The free-text prompt shown to the member. */
  scenarioPrompt: string;
  /** Optional context block (e.g. "imagine the member is at week 4 …"). */
  scenarioContext?: string | null;
  /** Member's free-text response, max ~600 chars (lesson form caps it). */
  memberResponse: string;
}

const SYSTEM_PREFIX = `Du er en coach-mentor der evaluerer en lærling.

Stilregler i feedback:
- Direkte og konkret. Maks 4 sætninger total i feedback_da.
- Skriv hvad lærlingen GJORDE godt og hvad næste skridt er.
- Aldrig generisk ros. Aldrig "lad os".
- Brug score 'strong' kun når lærlingen ramte rubric'ens kernepunkt.
  Brug 'on_track' når retningen er rigtig men eksekveringen mangler.
  Brug 'needs_work' når kernepunktet er misforstået.

# Output
Kald submit_eval-værktøjet med strukturen { score, feedback_da,
specific_strength?, specific_improvement? }. Skriv ALDRIG prosa
udenfor tool-kaldet.`;

/**
 * Assemble the full system prompt. Cache-stable per (rubric) so we
 * can prefix-cache once and re-use across a member's retakes of
 * the same lesson.
 */
export function buildPracticeSystemPrompt(rubric: string): string {
  return `${SYSTEM_PREFIX}\n\n# Rubric for denne opgave\n\n${rubric.trim()}`;
}

/** User payload: deterministic JSON so replays are stable. */
export function buildPracticeUserPayload(input: PracticeEvalInput): string {
  return JSON.stringify(
    {
      scenario_prompt: input.scenarioPrompt,
      scenario_context: input.scenarioContext ?? null,
      member_response: input.memberResponse,
    },
    null,
    2,
  );
}

/**
 * Map the LLM's parsed output to the caller type. Returns null when
 * the feedback is structurally valid but trivially short (under 10
 * chars after trim) — the lesson submit then saves "no eval" rather
 * than display a useless one-word feedback.
 */
export function mapToPracticeEval(
  raw: PracticeEvalOutput,
): PracticeEval | null {
  const trimmed = raw.feedback_da.trim();
  if (trimmed.length < 10) return null;
  return {
    score: raw.score,
    feedback_da: trimmed,
    specific_strength: raw.specific_strength?.trim() || undefined,
    specific_improvement: raw.specific_improvement?.trim() || undefined,
  };
}
