/**
 * Daily AI mental coach prompt — Claude wrapper.
 *
 * Spec: docs/superpowers/specs/2026-06-07-mental-health-pillar-v0-design.md §8
 *
 * Same caching + zod-validated output pattern as
 * src/lib/mind/session-generator-claude.ts. Returns null on any
 * failure so the cron's deterministic template can take over.
 *
 * Output: 200-400 word Danish reflection in three sections —
 *   ## Det jeg ser hos dig i dag
 *   ## Et spørgsmål til dig
 *   ## En lille ting at gøre i dag
 *
 * Voice-slot `[COACH_VOICE]` left as plain second-person until
 * the voice decision lands; renderer doesn't need to substitute
 * anything in v0.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { CoachContext } from "./coach-context";

export const COACH_MODEL_ID = "claude-sonnet-4-6";

const ReflectionSchema = z.object({
  body_md: z.string().min(300).max(2400),
});

type ReflectionOutput = z.infer<typeof ReflectionSchema>;

const SYSTEM_PROMPT = `Du er den daglige mentale coach for MakeIt // HQ — en dansk styrketrænings-platform.

Din opgave: skriv ÉN daglig refleksion (200–400 ord) til ét medlem ud fra dagens mind-check, HRV-trend og træningsuge.

# Format

Returnér body_md i markdown med præcis disse tre H2-sektioner i denne rækkefølge:
1. ## Det jeg ser hos dig i dag
2. ## Et spørgsmål til dig
3. ## En lille ting at gøre i dag

Ingen prose udenfor strukturen.

# Skrivestil

- Skriv på dansk i anden person ("du", "dig").
- Rolig, ærlig, ikke-alarmerende tone. Coach, ikke terapeut.
- 200–400 ord total. Hver sektion er 2-5 sætninger.
- Ingen medicinske påstande. Ingen diagnoser. Ingen lovning om resultater.
- Ingen pop-psykologi ("du er nok…", "tro på dig selv…").
- Aldrig opfinde tal. Brug kun de tal der står i payload, og kun ikke-null værdier.

# Hvad du må læse

- mind_today: dagens energi/stress/fokus (kan være null).
- mind_signal_7d: 7-dages medianer + low_for_days + freshness_days.
- hrv: ugens RMSSD-trend (kan være null).
- training: ugens session-status.

# Hvordan du skriver hver sektion

- Sektion 1 (Det jeg ser): observation baseret på tallene. Hvad ER mønstret i denne uge?
- Sektion 2 (Spørgsmål): ÉT konkret spørgsmål. Ikke retorisk.
- Sektion 3 (Lille ting): en handling der tager <2 min. Ikke en plan. En ting.

# Hvis data mangler

Hvis dagens mind-check mangler: anerkend det og fokuser på 7-dages medianen + HRV.
Hvis ALT er null: skriv en kort blød refleksion ("Vi har ikke nok data — log et mind-check…").
`;

export interface GenerateCoachOutputResult {
  bodyMd: string;
  modelId: string;
  tokensUsed: number;
}

export async function generateMentalCoachOutput(
  ctx: CoachContext,
): Promise<GenerateCoachOutputResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });
  const userPayload = JSON.stringify(ctx, null, 2);

  try {
    const response = await client.messages.parse({
      model: COACH_MODEL_ID,
      max_tokens: 1400,
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
              text:
                "Skriv dagens refleksion ud fra denne payload:\n\n" +
                userPayload,
            },
          ],
        },
      ],
      output_config: {
        format: zodOutputFormat(ReflectionSchema),
      },
    });

    const out: ReflectionOutput | null = response.parsed_output;
    if (!out) return null;

    return {
      bodyMd: out.body_md,
      modelId: COACH_MODEL_ID,
      tokensUsed:
        (response.usage.input_tokens ?? 0) + (response.usage.output_tokens ?? 0),
    };
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.warn(
        `[mind/coach-claude] Anthropic API error ${err.status}: ${err.message}`,
      );
    } else {
      console.warn("[mind/coach-claude] Failed:", err);
    }
    return null;
  }
}
