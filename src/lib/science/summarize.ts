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

// Banned language: the feed references research, it does not advise.
const BANNED = /\b(du bør|du skal|tag \d|anbefaler dig|din behandling|stil diagnose)\b/i;

interface SummarizeOptions {
  apiKey?: string;
}

async function callClaude(it: ScienceRecord, apiKey: string): Promise<{ tldr_da: string; caveat_da: string | null }> {
  const client = new Anthropic({ apiKey });
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
