/**
 * Claude wrapper that generates a 1-3 min personal mental session,
 * tailored to today's mind-check + HRV + training-week.
 *
 * Spec: docs/superpowers/specs/2026-06-07-mental-health-pillar-v0-design.md §7
 *
 * Pattern mirrors src/lib/hrv/insights-claude.ts:
 *   - server-only
 *   - cached system prefix (ephemeral cache_control) for cron batches
 *   - zod-validated structured output
 *   - returns null on any failure for graceful fallback
 *
 * Output schema is the SessionScript shape consumed by SessionRunner.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { CoachContext } from "./coach-context";
import type { SessionScript } from "./session-fallback";

export const SESSION_MODEL_ID = "claude-sonnet-4-6";

const SessionSchema = z.object({
  title: z.string().min(4).max(60),
  subtitle: z.string().min(4).max(80),
  body_md: z.string().min(200).max(2400),
  visual_pattern: z.enum(["box_breath_4_4_4_4", "coherence_5_5", "wave_4_8", "still_focus", "none"]),
  duration_seconds: z.number().int().min(60).max(300),
  category: z.enum(["breathing", "focus", "recovery", "debrief"]),
});

type SessionOutput = z.infer<typeof SessionSchema>;

const SYSTEM_PROMPT = `Du er den daglige mentale coach for MakeIt // HQ — en dansk styrketrænings-platform.

Din opgave: skriv ÉN personlig mini-session (60–300 sekunder) til ét medlem for i dag.

# Format

Du SKAL returnere strukturen:
- title: kort dansk titel (4–60 tegn)
- subtitle: undertitel som forklarer varigheden (4–80 tegn)
- body_md: selve session-scriptet i markdown med H2-overskrifter
- visual_pattern: ÉN af: "box_breath_4_4_4_4", "coherence_5_5", "wave_4_8", "still_focus", "none"
- duration_seconds: 60–300
- category: "breathing" | "focus" | "recovery" | "debrief"

# Skrivestil

- Skriv på dansk i anden person ("du", "dig").
- Rolig, kort, direkte. Ingen guruagtigt sprog. Ingen pop-psykologi.
- Brug H2-overskrifter (##) til at strukturere body_md i 3-5 sektioner.
- Ingen medicinske påstande. Du er ikke terapeut.
- Sessionen skal kunne læses og udføres uden audio.

# Hvordan du bruger payload

- mind_today: dagens mind-check (energy/stress/focus 1-5, kan være null).
- mind_signal_7d: medianer + low_for_days (antal dage med energy<=2 ELLER stress>=4 i streg).
- hrv: ugens RMSSD-trend.
- training: ugens session-status.

# Beslutningsregler for category + visual_pattern

- stress ≥ 4 i dag ELLER low_for_days ≥ 3: category="breathing", pattern="coherence_5_5" eller "wave_4_8" (lang udånding for nervesystemet).
- energy ≤ 2: category="recovery", pattern="none" eller "wave_4_8". Kort (90-150s). Med compassion.
- focus ≤ 2: category="focus", pattern="still_focus". Pre-priming.
- Efter dårlig session (last_session_was="tough" eller "missed"): category="debrief", pattern="still_focus".
- Default: category="focus", pattern="still_focus".

# Vigtigt

Ingen tal opfundet. Brug kun de tal der står i payload, og kun hvis de er ikke-null.
Hvis alle signaler er medium/null, skriv en kort generel fokus-session.

Du må KUN returnere strukturen — ingen extra prose udenfor.`;

export interface GenerateSessionResult {
  script: SessionScript;
  modelId: string;
  tokensUsed: number;
}

/**
 * Generate a personal session for the member's today. Returns null on
 * any failure (no API key, API error, parse failure, validation failure)
 * so the caller can fall back to buildFallbackSession().
 */
export async function generatePersonalSession(
  ctx: CoachContext,
): Promise<GenerateSessionResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });
  const userPayload = JSON.stringify(ctx, null, 2);

  try {
    const response = await client.messages.parse({
      model: SESSION_MODEL_ID,
      max_tokens: 1200,
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
                "Skriv dagens personlige mini-session ud fra denne payload:\n\n" +
                userPayload,
            },
          ],
        },
      ],
      output_config: {
        format: zodOutputFormat(SessionSchema),
      },
    });

    const out: SessionOutput | null = response.parsed_output;
    if (!out) return null;

    return {
      script: out,
      modelId: SESSION_MODEL_ID,
      tokensUsed:
        (response.usage.input_tokens ?? 0) + (response.usage.output_tokens ?? 0),
    };
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.warn(
        `[mind/session-generator] Anthropic API error ${err.status}: ${err.message}`,
      );
    } else {
      console.warn("[mind/session-generator] Failed:", err);
    }
    return null;
  }
}
