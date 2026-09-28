/**
 * HQ meal estimate — the Claude half (spec 2026-09-27 del A.2).
 *
 * Two calls, so the member can answer in between:
 *   identifyMeal  → is there food, and what does HQ need to ask?
 *   estimateMeal  → grams, kcal and macros per item, with an interval
 *
 * Same plug-in pattern as nutrition-photo-claude.ts: frozen, cacheable
 * system prompt, Zod-shaped output, and null on any failure so the sheet
 * falls back to manual entry instead of blocking the member.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  EstimateSchema,
  IdentifySchema,
  finalizeEstimate,
  type IdentifyResult,
  type MealEstimate,
} from "./nutrition-estimate";

/** Vision model for the estimate (spec D.3). Must pass the 30-meal evaluation. */
export const ESTIMATE_MODEL = "claude-sonnet-5";

export type MealInput = {
  photo?: { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" } | null;
  text?: string | null;
};

export type MealAnswer = { prompt: string; answer: string };

const SHARED = `Du er HQ, motoren i MakeIt // HQ, en dansk coaching-app til styrketræning.
Et medlem har spist noget, der ikke stod i madplanen, og vil have et estimat af
energi og makroer. Du får et foto, en kort tekst eller begge dele.

Sådan arbejder du:
- Estimér det, der faktisk er på billedet eller i teksten, ikke hvad en plan ønskede.
- Du kender dansk hverdagsmad, kantinemad, bagerivarer og restaurantportioner.
- Brug realistiske gram. Du kan ikke veje; sig det ærligt gennem sikkerhed og interval.
- Skriv på dansk, kort og konkret. Navne på ingredienser med småt, som man siger dem.

Sundhed (ufravigeligt):
- Du vurderer aldrig måltidet. Ingen "godt", "dårligt", "sundt", "usundt", "snyd",
  "synd", "cheat", "fortjent" eller råd om at spise mindre eller træne det af.
- Du kommenterer aldrig krop, vægt eller udseende.
- Du giver ingen sundheds- eller behandlingsråd.`;

const IDENTIFY_PROMPT = `${SHARED}

Din opgave nu: afgør, om der er mad, og om du skal spørge om noget, før du estimerer.
- foodVisible: false, hvis der ikke er mad eller drikke på billedet og teksten ikke
  beskriver et måltid.
- Stil kun et spørgsmål, når du reelt ikke kan se, hvad noget er, og svaret ændrer
  estimatet mærkbart (ca. 100 kcal eller mere). Højst tre spørgsmål. Ellers en tom liste.
- Hvert spørgsmål: kort prompt ("Hvad er den brune sauce?"), op til tre korte bud, og
  hvor på billedet det er. box er et omtrentligt rektangel med x, y, w, h mellem 0 og 1
  målt fra øverste venstre hjørne. Er du ikke sikker på placeringen, så sæt box til null
  og beskriv stedet i where ("øverst til venstre"). Uden foto er både box og where null.
- id: "1", "2", "3".`;

const ESTIMATE_PROMPT = `${SHARED}

Din opgave nu: estimér måltidet.
- items: 1–15 dele med gram, kcal, protein, kulhydrat og fedt (gram). Saml småting
  ("salat og tomat"). Glem ikke olie, dressing, smør og drikke, hvis de er med.
- assumption: én sætning om, hvad du har antaget, med samlet vægt ("Standard Cobb salad,
  ca. 450 g i alt.").
- confidence: high, når retten er tydelig og portionen kan ses; medium, når portionen er
  svær at vurdere; low, når dele er uklare.
- confidenceReason: én kort sætning om, hvorfor ("Portionen er svær at se på billedet.").
- kcalRange: et realistisk interval for hele måltidet. Omtrent ±15 % ved high, ±25 % ved
  medium, ±40 % ved low. Summen af items' kcal SKAL ligge inden for intervallet.
- Medlemmets svar på dine spørgsmål er facts; brug dem.`;

function content(input: MealInput, lead: string): Anthropic.Messages.ContentBlockParam[] {
  const blocks: Anthropic.Messages.ContentBlockParam[] = [{ type: "text", text: lead }];
  if (input.text?.trim()) blocks.push({ type: "text", text: `Medlemmets tekst: ${input.text.trim().slice(0, 500)}` });
  if (input.photo?.base64) {
    blocks.push({
      type: "image",
      source: { type: "base64", media_type: input.photo.mediaType, data: input.photo.base64 },
    });
  }
  return blocks;
}

function client(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return apiKey ? new Anthropic({ apiKey }) : null;
}

function warn(label: string, err: unknown) {
  if (err instanceof Anthropic.APIError) console.warn(`[nutrition-estimate] ${label} API error ${err.status}: ${err.message}`);
  else console.warn(`[nutrition-estimate] ${label} failed:`, err);
}

export async function identifyMeal(input: MealInput): Promise<IdentifyResult | null> {
  const c = client();
  if (!c || (!input.photo && !input.text?.trim())) return null;
  try {
    const res = await c.messages.parse({
      model: ESTIMATE_MODEL,
      max_tokens: 800,
      system: [{ type: "text", text: IDENTIFY_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: content(input, "Er der mad, og skal du spørge om noget?") }],
      output_config: { format: zodOutputFormat(IdentifySchema) },
    });
    const out = res.parsed_output ?? null;
    if (!out) return null;
    // Without a photo there is nothing to point at.
    if (!input.photo) out.questions = out.questions.map((q) => ({ ...q, box: null, where: null }));
    return out;
  } catch (err) {
    warn("identify", err);
    return null;
  }
}

export async function estimateMeal(input: MealInput, answers: MealAnswer[]): Promise<MealEstimate | null> {
  const c = client();
  if (!c || (!input.photo && !input.text?.trim())) return null;
  const lead = answers.length
    ? ["Estimér måltidet. Medlemmets svar:", ...answers.map((a) => `- ${a.prompt} → ${a.answer}`)].join("\n")
    : "Estimér måltidet.";
  try {
    const res = await c.messages.parse({
      model: ESTIMATE_MODEL,
      max_tokens: 1500,
      system: [{ type: "text", text: ESTIMATE_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: content(input, lead) }],
      output_config: { format: zodOutputFormat(EstimateSchema) },
    });
    const raw = res.parsed_output ?? null;
    return raw ? finalizeEstimate(raw) : null;
  } catch (err) {
    warn("estimate", err);
    return null;
  }
}
