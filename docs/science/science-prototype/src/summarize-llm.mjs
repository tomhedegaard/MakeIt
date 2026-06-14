// summarize-llm.mjs — produktions-resuméet: Claude skriver 2-4 danske sætninger,
// og den DETERMINISTISKE tal-verifikation sidder ovenpå uændret som guardrail.
//
// Flow:  LLM-udkast -> verificér tal mod abstract -> hvis fejl: ét retry ->
//        hvis stadig fejl: fald tilbage til den sikre template (ingen opfundne tal).
//
// Kræver env ANTHROPIC_API_KEY. Uden nøgle bruges template-fallback automatisk,
// så pipelinen aldrig går i stå.

import { summarize as templateSummarize, verifyNumbers } from "./pipeline.mjs";
import { CONFIG } from "../config.mjs";

const MODEL = "claude-haiku-4-5-20251001"; // billig, rigelig til korte resuméer

const SYSTEM = `Du skriver korte danske forskningsresuméer til et trænings-community.
Strenge regler:
- Brug KUN information fra det medsendte abstract. Ingen ekstern viden.
- Opfind ALDRIG tal. Hvert tal du skriver SKAL stå ordret i abstractet.
- 2-4 sætninger. Nøgternt, præcist, på dansk.
- Ingen diagnoser, ingen behandlings- eller kostråd, ingen "du bør".
- Nævn studiedesign (fx meta-analyse), hvad man fandt, og forbehold hvis relevant.
Svar KUN med JSON: {"tldr_da": "...", "caveat_da": "..."|null}`;

async function callClaude(it) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      system: SYSTEM,
      messages: [{ role: "user", content:
        `Tidsskrift: ${it.journal}\nTitel: ${it.title}\nDomæne: ${it.domainHint ?? ""}\n\nAbstract:\n${it.abstract}` }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = await res.json();
  const text = data.content?.[0]?.text ?? "{}";
  const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  return json;
}

// Banned-sprog: feedet refererer forskning, det rådgiver ikke.
const BANNED = /\b(du bør|du skal|tag \d|anbefaler dig|din behandling|stil diagnose)\b/i;

export async function summarizeProd(it, scored) {
  const template = templateSummarize(it, scored); // altid en sikker baseline

  if (!process.env.ANTHROPIC_API_KEY) {
    return { ...template, method: "template (ingen API-nøgle)" };
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const draft = await callClaude(it);
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
          method: `llm (${MODEL}), forsøg ${attempt}`,
        };
      }
    } catch (err) {
      console.warn(`[summarize] LLM forsøg ${attempt} fejlede: ${err.message}`);
    }
  }
  // Guardrail udløst: fald tilbage til den deterministiske template (kan ikke lyve).
  return { ...template, method: "template-fallback (LLM bestod ikke guardrail)" };
}
