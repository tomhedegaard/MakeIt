/**
 * Claude prose layer for HRV weekly insights.
 *
 * Thin IO wrapper: given a pre-computed `InsightData` (week stats + correlation
 * cards from `insights.ts`), call Sonnet 4.6 to write a single ~150-word Danish
 * observation in MakeIt // HQ's HRV-coach voice. The system prompt is cached
 * (ephemeral) so the weekly-insights cron's batch of members shares the cached
 * prefix and reads at ~0.1× cost.
 *
 * Returns null on any failure so the cron's deterministic template summary
 * (`buildTemplateSummary`) can take over. Never throws.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { InsightData } from "./insights";

export const INSIGHT_MODEL_ID = "claude-sonnet-4-6";

/* ---------------------------------------------------------------- *
 * Output schema (Zod) — a single Danish observation paragraph.
 * ---------------------------------------------------------------- */

const ObservationSchema = z.object({
  // Upper bound sized for the system prompt's "~150 ord" instruction —
  // ~150 Danish words is roughly 1000–1100 chars, so 1400 gives headroom
  // while still rejecting a runaway response. Revisit if the word count changes.
  observation: z.string().min(40).max(1400),
});

type ObservationOutput = z.infer<typeof ObservationSchema>;

/* ---------------------------------------------------------------- *
 * System prompt (frozen — cacheable prefix)
 * ---------------------------------------------------------------- */

const SYSTEM_PROMPT = `Du er HRV-coachen for MakeIt // HQ — en dansk styrketrænings-platform.
Din opgave er at skrive ÉN ugentlig observation til ét medlem om deres
hjerterytmevariabilitet (HRV) i den forgangne uge.

# Skrivestil

- Skriv på dansk, i anden person ("du", "din", "dig").
- Cirka 150 ord. Én sammenhængende observation — ikke punktopstilling.
- Rolig, ærlig og ikke-alarmerende tone. Du er en coach, ikke en læge.
- Ingen medicinske påstande og ingen diagnoser. HRV er et træningssignal,
  ikke en sundhedsvurdering.

# Tal — den vigtigste regel

Du modtager FÆRDIGBEREGNEDE tal som JSON. Du må ALDRIG opfinde,
ændre, afrunde eller udregne nye tal. Du må kun henvise til de tal,
der står i payloaden. Hvis et tal ikke er givet, så nævn det ikke.

# Payloadens form (InsightData)

- weekStart: mandag (YYYY-MM-DD) i den uge observationen dækker.
- weekStats:
  - weekMeanRmssd: ugens gennemsnitlige RMSSD i ms (eller null).
  - priorWeekMeanRmssd: ugen før (eller null).
  - weekReadingCount: antal målinger i ugen.
- correlationCards: en liste af kort, ét pr. livsstilsfaktor:
  - factor: "alcohol" (alkohol) eller "sleep" (kort søvn).
  - status: "ok" eller "insufficient_data".
  - exposedN / baselineN: antal dage i hver gruppe.
  - exposedMeanRmssd / baselineMeanRmssd: gruppegennemsnit i ms.
  - deltaPct: procentforskel (eksponeret vs. baseline). Negativ = lavere HRV.

# Hvordan du bruger kortene

- status = "ok": du må omtale sammenhængen og henvise til deltaPct.
- status = "insufficient_data": der er IKKE nok data. Lad være med at
  foregive et mønster. Du kan nævne, at fortsat logning vil afdække
  sammenhænge — men opfind aldrig en effekt.

# Hvis ugen mangler data

Hvis weekMeanRmssd er null, så vær ærlig om at der ikke var målinger nok,
og opfordr venligt til at måle igen — uden at male fanden på væggen.

Skriv kun selve observationen.`;

/* ---------------------------------------------------------------- *
 * Public API
 * ---------------------------------------------------------------- */

export interface InsightSummaryResult {
  summaryText: string;
  modelId: string;
  tokensUsed: number;
}

/**
 * Generate a ~150-word Danish weekly HRV observation from pre-computed
 * `InsightData`. Returns null on any failure (missing API key, API error,
 * unparseable output) so the caller can fall back to the template summary.
 */
export async function generateInsightSummary(
  data: InsightData,
): Promise<InsightSummaryResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });

  // Deterministic user payload — same shape every call so the cached
  // system prefix keeps hitting across the cron's batch.
  const userPayload = JSON.stringify(data, null, 2);

  try {
    const response = await client.messages.parse({
      model: INSIGHT_MODEL_ID,
      max_tokens: 600,
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
                "Skriv ugens observation ud fra disse beregnede tal:\n\n" +
                userPayload,
            },
          ],
        },
      ],
      output_config: {
        format: zodOutputFormat(ObservationSchema),
      },
    });

    const out: ObservationOutput | null = response.parsed_output;
    if (!out) return null;

    return {
      summaryText: out.observation,
      modelId: INSIGHT_MODEL_ID,
      tokensUsed:
        (response.usage.input_tokens ?? 0) +
        (response.usage.output_tokens ?? 0),
    };
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.warn(
        `[insights-claude] Anthropic API error ${err.status}: ${err.message}`,
      );
    } else {
      console.warn("[insights-claude] Failed:", err);
    }
    return null;
  }
}
