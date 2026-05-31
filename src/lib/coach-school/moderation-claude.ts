/**
 * Crew Coaching Pyramid — message moderation Claude wrapper (server-only, CC-9).
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §9
 *
 * Async wrapper around the Anthropic SDK that flags outgoing co-coach
 * messages on four categories: medical_claim, injury_advice,
 * demotivating_tone, off_topic_promotion.
 *
 * Plug-in semantics — same shape as practice-eval-claude.ts:
 *   - Returns a `SafetyVerdict` (held or pass) on success.
 *   - Returns `null` on missing key / API error / Zod failure /
 *     empty parsed_output. Callers treat null as "moderation
 *     unavailable, fall through to allow" — fail-open is honest
 *     about v0's reliability ceiling and avoids silently blocking
 *     every message when Anthropic is down. The injury-keyword
 *     pre-check still fires regardless of Claude availability, so
 *     the most dangerous case (injury language) is covered.
 *
 * Caching: the system prompt is `cache_control: ephemeral` so
 * repeated moderation calls within a session hit cache.
 *
 * Lessons re-applied:
 *   - Loud warn on missing key (no silent fallback).
 *   - Loud warn when parsed_output is null with stop_reason.
 *   - Callers SHOULD dynamic-import this module to keep Turbopack
 *     on its happy path with @anthropic-ai/sdk/helpers/zod.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import {
  SAFETY_CATEGORIES,
  isSafetyCategory,
  type SafetyVerdict,
} from "./safety";

/** Zod schema Claude is forced to call via submit_moderation tool. */
const ModerationOutputSchema = z.object({
  held: z
    .boolean()
    .describe(
      "True if the message hits any category and should be held for Munk review.",
    ),
  category: z
    .enum([
      "medical_claim",
      "injury_advice",
      "demotivating_tone",
      "off_topic_promotion",
      "none",
    ])
    .describe(
      "Which category triggered the hold, or 'none' when held=false. Pick the strongest single match — don't list multiple.",
    ),
  explanation: z
    .string()
    .max(200)
    .describe(
      "1–2 sentences in Danish explaining the call — shown to Munk in the held-message inbox.",
    ),
});

type ModerationOutput = z.infer<typeof ModerationOutputSchema>;

function buildSystemPrompt(): string {
  return [
    "Du er sikkerheds-moderator for et fitness-coaching-app.",
    "Co-coaches sender korte beskeder (≤1000 tegn) til medlemmer — du klassificerer hver besked.",
    "",
    "Flag besked som HELD hvis den falder i én af disse kategorier:",
    "",
    "- medical_claim — påstande om medicinske effekter, diagnoser, eller behandling",
    '  ("dette helbreder din skade", "du har sandsynligvis en discusprolaps")',
    "- injury_advice — råd om hvordan medlemmet skal håndtere skade/smerte",
    '  ("træn igennem smerten", "tag noget Panodil og fortsæt")',
    "- demotivating_tone — nedladende, dømmende, eller hånlig tone",
    '  ("du er for svag", "du laver det her dårligt")',
    "- off_topic_promotion — promo for eksterne produkter/services',",
    '  ("køb mit kursus", "tag dette supplement")',
    "",
    "Hvis beskeden er konstruktivt coaching-feedback uden disse røde flag: held=false, category=none.",
    "",
    "Vær konservativ: tvivl → held=false. Vi er fail-open i v0 (Munk ser stadig alt på sin queue).",
    "Forklaring skal være kort dansk (1-2 sætninger) — vises i Munks held-message inbox.",
    "Brug submit_moderation til at returnere din vurdering.",
  ].join("\n");
}

function buildUserPayload(args: {
  messageText: string;
  reviewMode: "sandbox" | "live";
  decision: string;
}): string {
  return [
    `[review_mode: ${args.reviewMode}]`,
    `[decision: ${args.decision}]`,
    `[message]:`,
    args.messageText,
  ].join("\n");
}

function mapToVerdict(out: ModerationOutput): SafetyVerdict {
  if (!out.held || out.category === "none") {
    return { held: false, reason: null };
  }
  if (!isSafetyCategory(out.category)) {
    // Defensive: Claude returned a value outside our enum despite schema.
    console.warn(
      `[coach-school/moderation] unknown category from Claude: ${out.category}`,
    );
    return { held: false, reason: null };
  }
  return {
    held: true,
    reason: {
      kind: "moderation_category",
      category: out.category,
      explanation: out.explanation,
    },
  };
}

export async function moderateCoachMessage(args: {
  messageText: string;
  reviewMode: "sandbox" | "live";
  decision: string;
}): Promise<SafetyVerdict | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn(
      "[coach-school/moderation] ANTHROPIC_API_KEY missing — moderation skipped (fail-open)",
    );
    return null;
  }

  const client = new Anthropic({ apiKey });
  const system = buildSystemPrompt();
  const userPayload = buildUserPayload(args);

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: [
        {
          type: "text",
          text: system,
          // Cache the (large) safety rubric so back-to-back submits
          // within the cache TTL pay tokens only for the message.
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
                "Klassificér beskeden nedenfor. Returnér via submit_moderation.\n\n" +
                userPayload,
            },
          ],
        },
      ],
      output_config: {
        format: zodOutputFormat(ModerationOutputSchema),
      },
    });

    const out: ModerationOutput | null = response.parsed_output;
    if (!out) {
      const firstBlock = response.content?.[0];
      const blockType = firstBlock?.type ?? "none";
      console.warn(
        `[coach-school/moderation] parsed_output=null stop=${response.stop_reason} block=${blockType}`,
      );
      return null;
    }

    return mapToVerdict(out);
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.warn(
        `[coach-school/moderation] Anthropic API error ${err.status}: ${err.message}`,
      );
    } else {
      console.warn("[coach-school/moderation] Failed:", err);
    }
    return null;
  }
}

// Re-export so action sites only need this module.
export { SAFETY_CATEGORIES };
