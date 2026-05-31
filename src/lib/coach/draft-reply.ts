/**
 * Munk Multiplier — draft form-check reply: pure helpers + prompt.
 *
 * Spec: docs/superpowers/specs/2026-05-26-munk-multiplier-v0-design.md §6
 *
 * Pure: no DB, no LLM, no `server-only`. The async wrapper that calls
 * Claude lives in `draft-reply-claude.ts` (same split as
 * `reasoning.ts` / `reasoning-claude.ts`). Tests run in Node without
 * server-only friction.
 *
 * What lives here:
 *   - DraftReplySchema — Zod output schema (the LLM's structured reply)
 *   - buildVoiceSystemPrompt — assembles the cached system prompt with
 *     3 voice samples as few-shot <example> blocks
 *   - buildDraftUserPayload — the form-check context the LLM reasons over
 *   - mapToDraft — LLM output → internal DraftReply shape
 *   - pickVoiceSamples — balanced selection from the voice pool
 *
 * Caching note: the cron picks samples ONCE per batch and reuses the
 * same system prompt for every form-check in that run, so the cached
 * prefix hits after the first call.
 */

import { z } from "zod";

export type VoiceTone = "encouraging" | "corrective" | "terse" | "playful";

export interface VoiceSample {
  replyText: string;
  tone: VoiceTone;
}

/** Form-check context the draft generator reasons over. Mirrors the
 * relevant columns of the form_checks row + its joined exercise. */
export interface FormCheckContext {
  exerciseName: string;
  aiScore: number | null;
  aiHeadline: string | null;
  aiPos: string[];
  aiNeg: string[];
  aiFix: string | null;
}

/** The internal shape persisted into form_checks.ai_drafted_reply
 * (+ surrounding columns). */
export interface DraftReply {
  replyDa: string;
  tone: VoiceTone;
  confidence: number;
}

/* ---------------------------------------------------------------- *
 * Output schema (Zod)
 * ---------------------------------------------------------------- */

export const DraftReplySchema = z.object({
  reply_da: z.string().min(10).max(400),
  tone: z.enum(["encouraging", "corrective", "terse", "playful"]),
  confidence: z.number().min(0).max(1),
});

export type DraftReplyOutput = z.infer<typeof DraftReplySchema>;

/* ---------------------------------------------------------------- *
 * System prompt
 * ---------------------------------------------------------------- */

/** Frozen voice-rule prefix. The few-shot samples are appended by
 * buildVoiceSystemPrompt; keeping the rules const makes the diff
 * obvious if we ever retune the voice. */
const VOICE_RULES = `Du skriver et coach-svar i Munks stil til et form-check.

Stilregler:
- Korte sætninger. Direkte. Maks 4 sætninger.
- Aldrig "lad os" — sig hvad medlemmet skal gøre.
- Start med det positive (én sætning). Så det vigtigste cue.
  Slut med en konkret handling til næste session.
- Ingen hilsen, ingen underskrift — bare svaret.
- Skriv ALDRIG procentangivelser eller AI-jargon. AI-scoren er
  rådata til DIG; brug den til at vælge cue, ikke til at prædike.

Vælg en tone der passer til situationen: encouraging, corrective,
terse, eller playful. Match Munks faktiske stemme fra eksemplerne.`;

const OUTPUT_INSTRUCTION = `# Output
Kald submit_reply tool'et med { reply_da, tone, confidence }.
confidence (0..1) = hvor sikker du er på at svaret rammer Munks
intention. Skriv ALDRIG prosa udenfor tool-kaldet.`;

/**
 * Assemble the full system prompt with the supplied voice samples as
 * few-shot `<example>` blocks. The caller picks the samples (typically
 * once per cron batch) so the prompt — and thus the cache prefix —
 * stays stable across the batch.
 */
export function buildVoiceSystemPrompt(samples: VoiceSample[]): string {
  const examples = samples
    .map(
      (s) =>
        `<example tone="${s.tone}">\n${s.replyText.trim()}\n</example>`
    )
    .join("\n\n");
  const exampleBlock = examples
    ? `\n\n# Eksempler på Munks stemme\n\n${examples}`
    : "";
  return `${VOICE_RULES}${exampleBlock}\n\n${OUTPUT_INSTRUCTION}`;
}

/* ---------------------------------------------------------------- *
 * User payload
 * ---------------------------------------------------------------- */

/**
 * Build the form-check context the LLM reasons over. Deterministic
 * JSON so replays are stable. The AI analysis (score/headline/pos/
 * neg/fix) is the raw material; the prompt tells the model to use it
 * for cue selection, not to parrot it.
 */
export function buildDraftUserPayload(ctx: FormCheckContext): string {
  return JSON.stringify(
    {
      exercise: ctx.exerciseName,
      ai_analysis: {
        score: ctx.aiScore,
        headline: ctx.aiHeadline,
        positives: ctx.aiPos,
        negatives: ctx.aiNeg,
        suggested_fix: ctx.aiFix,
      },
    },
    null,
    2
  );
}

/* ---------------------------------------------------------------- *
 * Output mapping
 * ---------------------------------------------------------------- */

/**
 * Map the LLM's snake_case output to the internal DraftReply shape.
 * Returns null when structurally valid but unusable (empty reply after
 * trim) — caller then leaves ai_drafted_reply null and Munk writes
 * from scratch.
 */
export function mapToDraft(raw: DraftReplyOutput): DraftReply | null {
  const trimmed = raw.reply_da.trim();
  if (trimmed.length < 10) return null;
  return {
    replyDa: trimmed,
    tone: raw.tone,
    confidence: raw.confidence,
  };
}

/* ---------------------------------------------------------------- *
 * Voice-sample selection
 * ---------------------------------------------------------------- */

/**
 * Pick up to `count` samples from the pool, balanced across tones
 * where possible (so the few-shot spans Munk's registers rather than
 * three samples of the same tone). Deterministic given the same `rng`
 * — tests inject a fixed rng; the cron uses Math.random.
 *
 * Strategy: bucket by tone, round-robin one from each tone bucket
 * (shuffled within bucket by rng) until we have `count` or run dry.
 */
export function pickVoiceSamples(
  pool: VoiceSample[],
  count: number,
  rng: () => number = Math.random
): VoiceSample[] {
  if (count <= 0 || pool.length === 0) return [];

  const buckets = new Map<VoiceTone, VoiceSample[]>();
  for (const s of pool) {
    const arr = buckets.get(s.tone) ?? [];
    arr.push(s);
    buckets.set(s.tone, arr);
  }
  // Shuffle each bucket deterministically with the injected rng.
  for (const arr of buckets.values()) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  const toneOrder: VoiceTone[] = [
    "corrective",
    "encouraging",
    "terse",
    "playful",
  ];
  const picked: VoiceSample[] = [];
  // Round-robin across tone buckets until we have `count`.
  let madeProgress = true;
  while (picked.length < count && madeProgress) {
    madeProgress = false;
    for (const tone of toneOrder) {
      if (picked.length >= count) break;
      const arr = buckets.get(tone);
      if (arr && arr.length > 0) {
        picked.push(arr.shift()!);
        madeProgress = true;
      }
    }
  }
  return picked;
}
