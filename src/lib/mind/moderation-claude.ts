/**
 * Claude moderation for journal entries + AI mental coach output (MH-9).
 *
 * Spec: docs/superpowers/specs/2026-06-07-mental-health-pillar-v0-design.md §11
 *
 * Runs AFTER the synchronous keyword pre-filter (crisis-keywords.ts) as
 * a deeper second check. The keyword filter catches obvious phrases;
 * Claude catches harder cases (oblique language, mixed signals, sarcasm
 * that looks like crisis but isn't, etc.).
 *
 * Returns null on any failure. The caller combines that with the
 * keyword pre-filter via combineModerationVerdicts — Claude-null is
 * fail-closed (flagged), never treated as clean.
 *
 * Conservative principle: when in doubt, lean toward "flagged". False
 * positives surface the resources modal (helpful); false negatives are
 * the failure mode we want to avoid.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export { combineModerationVerdicts } from "./moderation";

export const MODERATION_MODEL_ID = "claude-haiku-4-5-20251001";

const ModerationSchema = z.object({
  status: z.enum(["clean", "flagged", "crisis"]),
  categories: z.array(
    z.enum(["self_harm", "suicidal", "severe", "substance", "abuse", "other"]),
  ),
  reason: z.string().min(2).max(280),
});

export type ModerationResult = z.infer<typeof ModerationSchema>;

const SYSTEM_PROMPT = `Du modererer kort dansk tekst for et mentalt-sundhed modul i en træningsapp.

Din opgave: klassificer den givne tekst som "clean", "flagged" eller "crisis" og angiv kategorier.

# Klassifikation

- **crisis**: explicit eller stærkt antydet selvskade, selvmordstanker, eller livstruende substansbrug. Personen virker akut udsat.
- **flagged**: bekymrende sprog der peger på dyb mistrivsel, men ikke eksplicit livstruende. Eller markant negativt selv-tale der gentager sig.
- **clean**: normal frustration, træthed, dårlig dag, vrede, sorg, eller hvad som helst der ikke peger på krise.

# Kategorier (kan være flere)

- self_harm: skade på sig selv (kunne være skære, brænde, anden vold)
- suicidal: tanker om at dø eller tage sit liv
- severe: alvorlig håbløshed/dyb mistrivsel uden specifik krise
- substance: substansbrug i krise-niveau
- abuse: omtale af at blive misbrugt eller misbruge andre (uden for "tough day" tone)
- other: bekymrende men ikke i ovenstående kategorier

# Vigtige regler

- Korte normale beskeder ("Træningen var skidt", "Jeg er træt") = clean.
- Vrede over træning/arbejde uden vold/skade = clean.
- Ironi/joke er svært — hvis du er i tvivl, lean mod flagged hellere end clean.
- Reason: kort dansk sætning (≤ 280 tegn) der forklarer din klassifikation.

Output kun strukturen.`;

/**
 * Moderate a member-written body of text (typically a journal entry).
 * Returns null on any API failure. The caller must run
 * combineModerationVerdicts — do not treat null as clean.
 */
export async function moderateJournalText(
  body: string,
): Promise<ModerationResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (body.trim().length === 0) {
    return { status: "clean", categories: [], reason: "tom tekst" };
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: MODERATION_MODEL_ID,
      max_tokens: 400,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Tekst at vurdere:\n\n" + body.slice(0, 4000),
            },
          ],
        },
      ],
      output_config: {
        format: zodOutputFormat(ModerationSchema),
      },
    });

    const out: ModerationResult | null = response.parsed_output;
    return out ?? null;
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.warn(
        `[mind/moderation] Anthropic API error ${err.status}: ${err.message}`,
      );
    } else {
      console.warn("[mind/moderation] Failed:", err);
    }
    return null;
  }
}

