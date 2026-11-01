// src/lib/science/summarize.ts
// Production summary: Claude (Haiku) writes 2-4 Danish sentences, and the
// DETERMINISTIC number verification sits on top UNCHANGED as the guardrail.
//
// Flow:  LLM draft -> verify numbers against abstract -> on failure: one retry
//        -> still failing: fall back to the safe template (no invented numbers).
//
// Needs env ANTHROPIC_API_KEY. Without a key the template fallback is used
// automatically so the pipeline never stalls. Mirrors the prototype
// (docs/science/science-prototype/src/summarize-llm.mjs), re-expressed with the
// repo-idiomatic @anthropic-ai/sdk structured-output pattern (see
// src/lib/mind/coach-claude.ts) — the verifyNumbers guardrail is byte-identical.

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { summarize as templateSummarize, verifyNumbers } from "./pipeline";
import type { ScienceRecord, ScoredRecord, Summary } from "./types";

export const SCIENCE_SUMMARY_MODEL = "claude-haiku-4-5-20251001"; // cheap, ample for short summaries
// Haiku's Danish titles had real errors ("vheyprotein", "dramatechnikkernes",
// 1/11). At most ~10 short translations a day, so Sonnet's price is small.
export const SCIENCE_TRANSLATE_MODEL = "claude-sonnet-5-5";

const SummarySchema = z.object({
  tldr_da: z.string(),
  caveat_da: z.string().nullable(),
});

const SYSTEM = `Du skriver korte danske forskningsresuméer til et trænings-community.
Strenge regler:
- Brug KUN information fra det medsendte abstract. Ingen ekstern viden.
- Opfind ALDRIG tal. Hvert tal du skriver SKAL stå ordret i abstractet.
- 2-4 sætninger. Nøgternt, præcist, på dansk.
- Ingen diagnoser, ingen behandlings- eller kostråd, ingen "du bør".
- Nævn studiedesign (fx meta-analyse), hvad man fandt, og forbehold hvis relevant.`;

// The SDK default is a 10-minute timeout with 2 retries: one hung call could
// eat the whole cron budget. A slow summary falls back to the template.
const CALL_TIMEOUT_MS = 20_000;

function scienceClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, timeout: CALL_TIMEOUT_MS, maxRetries: 1 });
}

// Banned language: the feed references research, it does not advise.
const BANNED = /\b(du bør|du skal|tag \d|anbefaler dig|din behandling|stil diagnose)\b/i;

interface SummarizeOptions {
  apiKey?: string;
}

async function callClaude(it: ScienceRecord, apiKey: string): Promise<{ tldr_da: string; caveat_da: string | null }> {
  const client = scienceClient(apiKey);
  const response = await client.messages.parse({
    model: SCIENCE_SUMMARY_MODEL,
    max_tokens: 400,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Tidsskrift: ${it.journal}\nTitel: ${it.title}\nDomæne: ${it.domainHint ?? ""}\n\nAbstract:\n${it.abstract}`,
          },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(SummarySchema) },
  });
  const out = response.parsed_output;
  if (!out) throw new Error("no parsed output");
  return out;
}

export async function summarizeProd(
  it: ScienceRecord,
  scored: ScoredRecord,
  opts: SummarizeOptions = {},
): Promise<Summary> {
  const template = templateSummarize(it, scored); // always a safe baseline
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return { ...template, method: "template (ingen API-nøgle)" };
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const draft = await callClaude(it, apiKey);
      const tldr = (draft.tldr_da ?? "").trim();
      const verification = verifyNumbers(tldr, it.abstract);
      if (verification.ok && !BANNED.test(tldr) && tldr.length > 20) {
        return {
          tldr_da: tldr,
          caveat_da: draft.caveat_da ?? null,
          sourceConclusion: template.sourceConclusion,
          effect_da: template.effect_da,
          participants: template.participants,
          verification,
          method: `llm (${SCIENCE_SUMMARY_MODEL}), forsøg ${attempt}`,
        };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[science/summarize] LLM forsøg ${attempt} fejlede: ${msg}`);
    }
  }
  // Guardrail tripped: fall back to the deterministic template (cannot lie).
  return { ...template, method: "template-fallback (LLM bestod ikke guardrail)" };
}

// ---- Danish title + conclusion ---------------------------------------------
// The paper title and the verbatim abstract conclusion were shown in English.
// A translation is kept only if every number in it appears verbatim in the
// original (same verifyNumbers guardrail); otherwise the English stays.

const TranslationSchema = z.object({
  title_da: z.string(),
  source_conclusion_da: z.string().nullable(),
});

const TRANSLATE_SYSTEM = `Du oversætter titler og konklusioner fra videnskabelige artikler til dansk for et trænings-community.
Strenge regler:
- Oversæt tro mod originalen. Tilføj, fjern eller fortolk intet.
- Behold ALLE tal præcis som i originalen, også decimalpunktum (skriv 0.37, ikke 0,37).
- Behold forkortelser som RCT, SMD, MD, CI og navne på stoffer og tests.
- Naturligt, nøgternt dansk. Ingen råd, ingen "du bør".`;

export interface FeedTranslation {
  title_da: string | null;
  source_conclusion_da: string | null;
}

/** The Danish text, or null when it is empty or carries a number the original does not. */
export function keepVerifiedTranslation(da: string | null | undefined, original: string | null): string | null {
  const text = (da ?? "").trim();
  if (!text || !original) return null;
  return verifyNumbers(text, original).ok && !BANNED.test(text) ? text : null;
}

export async function translateForFeed(
  item: { title: string; sourceConclusion: string | null },
  opts: SummarizeOptions = {},
): Promise<FeedTranslation> {
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { title_da: null, source_conclusion_da: null };
  const client = scienceClient(apiKey);
  // ponytail: no server-side refusal fallback (SDK 0.95 predates `fallbacks`);
  // a refusal leaves the English and the row is retried the next day.
  const response = await client.messages.parse({
    model: SCIENCE_TRANSLATE_MODEL,
    // Room for adaptive thinking (on by default) plus the short answer.
    max_tokens: 2000,
    system: [{ type: "text", text: TRANSLATE_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Titel:\n${item.title}\n\nKonklusion:\n${item.sourceConclusion ?? "(ingen — returnér null)"}`,
          },
        ],
      },
    ],
    // A translation needs little reasoning; low effort keeps it fast.
    output_config: { effort: "low", format: zodOutputFormat(TranslationSchema) },
  });
  const out = response.parsed_output;
  if (!out) throw new Error(`no parsed output (stop_reason ${response.stop_reason})`);
  return {
    title_da: keepVerifiedTranslation(out.title_da, item.title),
    source_conclusion_da: keepVerifiedTranslation(out.source_conclusion_da, item.sourceConclusion),
  };
}
