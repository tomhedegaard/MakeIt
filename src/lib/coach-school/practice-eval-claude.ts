/**
 * Crew Coaching Pyramid — practice-eval Claude wrapper (server-only, CC-6).
 *
 * Async wrapper around the Anthropic SDK. Pure schema + prompt logic
 * lives in `practice-eval.ts`.
 *
 * Plug-in semantics: returns a `PracticeEval` on success, or `null` on
 * missing key / API error / Zod failure / empty feedback. The lesson
 * submit-action treats null as "save the response without an eval"
 * — the lesson_progress row keeps `practice_eval` null and the UI
 * shows a graceful "evaluation unavailable" note.
 *
 * Lessons applied from the adaptive-reasoning + draft-reply rollouts:
 *   - Explicit warn at the missing-key guard (no silent fallback).
 *   - Loud warn when parsed_output is null (capture stop_reason).
 *   - Callers SHOULD dynamic-import this module (see the submit
 *     action) to keep Turbopack on its happy path.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import {
  PracticeEvalSchema,
  buildPracticeSystemPrompt,
  buildPracticeUserPayload,
  mapToPracticeEval,
  type PracticeEval,
  type PracticeEvalInput,
  type PracticeEvalOutput,
} from "./practice-eval";

export async function generatePracticeEval(
  input: PracticeEvalInput,
): Promise<PracticeEval | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn(
      "[coach-school/practice-eval] ANTHROPIC_API_KEY missing — skipping eval, lesson_progress.practice_eval stays null",
    );
    return null;
  }

  const client = new Anthropic({ apiKey });
  const system = buildPracticeSystemPrompt(input.rubric);
  const userPayload = buildPracticeUserPayload(input);

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system: [
        {
          type: "text",
          text: system,
          // Cache the rubric-bound prefix — repeated retakes of the
          // same lesson hit cache from the second submit onward.
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
                "Evaluér lærlingens svar mod rubric'en. Returnér via submit_eval.\n\n" +
                userPayload,
            },
          ],
        },
      ],
      output_config: {
        format: zodOutputFormat(PracticeEvalSchema),
      },
    });

    const out: PracticeEvalOutput | null = response.parsed_output;
    if (!out) {
      const firstBlock = response.content?.[0];
      const blockType = firstBlock?.type ?? "none";
      console.warn(
        `[coach-school/practice-eval] parsed_output=null stop=${response.stop_reason} block=${blockType}`,
      );
      return null;
    }

    return mapToPracticeEval(out);
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.warn(
        `[coach-school/practice-eval] Anthropic API error ${err.status}: ${err.message}`,
      );
    } else {
      console.warn("[coach-school/practice-eval] Failed:", err);
    }
    return null;
  }
}
