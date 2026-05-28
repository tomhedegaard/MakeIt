/**
 * Munk Multiplier — draft form-check reply: Claude wrapper (server-only).
 *
 * Async wrapper around the Anthropic SDK. Pure logic — schema, prompt,
 * payload, mapping, sample selection — lives in `draft-reply.ts`.
 *
 * Plug-in semantics: returns a `DraftReply` on success, or `null` on
 * missing key / API error / Zod failure / empty reply. The draft cron
 * (MM-5) treats null as "no draft staged" — Munk writes from scratch.
 *
 * Lessons applied from the adaptive reasoning bug:
 *   - Explicit warn at the missing-key guard (no silent fallback).
 *   - Loud warn when parsed_output is null (capture stop_reason).
 *   - Callers SHOULD dynamic-import this module (see MM-5 cron) to
 *     keep Turbopack on its happy path, matching program-generator.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import {
  DraftReplySchema,
  buildDraftUserPayload,
  buildVoiceSystemPrompt,
  mapToDraft,
  type DraftReply,
  type DraftReplyOutput,
  type FormCheckContext,
  type VoiceSample,
} from "./draft-reply";

export async function generateDraftReply(args: {
  formCheck: FormCheckContext;
  voiceSamples: VoiceSample[];
}): Promise<DraftReply | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn(
      "[coach/draft-reply-claude] ANTHROPIC_API_KEY missing — skipping draft, Munk writes from scratch"
    );
    return null;
  }

  const client = new Anthropic({ apiKey });
  const system = buildVoiceSystemPrompt(args.voiceSamples);
  const userPayload = buildDraftUserPayload(args.formCheck);

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: [
        {
          type: "text",
          text: system,
          // Cached prefix. Stable across a cron batch (same samples),
          // so the second form-check onward reads from cache.
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
                "Skriv et coach-svar i Munks stil til dette form-check. Returnér via submit_reply.\n\n" +
                userPayload,
            },
          ],
        },
      ],
      output_config: {
        format: zodOutputFormat(DraftReplySchema),
      },
    });

    const out: DraftReplyOutput | null = response.parsed_output;
    if (!out) {
      const firstBlock = response.content?.[0];
      const blockType = firstBlock?.type ?? "none";
      console.warn(
        `[coach/draft-reply-claude] parsed_output=null stop=${response.stop_reason} block=${blockType}`
      );
      return null;
    }

    return mapToDraft(out);
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.warn(
        `[coach/draft-reply-claude] Anthropic API error ${err.status}: ${err.message}`
      );
    } else {
      console.warn("[coach/draft-reply-claude] Failed:", err);
    }
    return null;
  }
}
