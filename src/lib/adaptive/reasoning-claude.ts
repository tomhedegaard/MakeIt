/**
 * Adaptive Program Engine — Claude reasoning wrapper (server-only).
 *
 * Async wrapper around the Anthropic SDK. The pure logic — schema,
 * prompt, payload building, output mapping — lives in `reasoning.ts`
 * so tests can run in Node without a `server-only` import or an API
 * key. Same split pattern as `insights.ts` / `insights-claude.ts`
 * and `program-generator.ts` / `program-generator-claude.ts`.
 *
 * Plug-in semantics: returns a `ReasoningRefinement` on success, or
 * `null` on:
 *   - Missing `ANTHROPIC_API_KEY` (dev / CI without secrets)
 *   - API error / timeout
 *   - Zod validation failure on the response
 *   - Semantic validation failure (e.g. swap without ids — handled
 *     by mapToRefinement)
 *
 * The cron handler treats `null` as "use the rule layer's decision
 * verbatim" — the engine stays live; only the refinement is skipped.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import type { ReasoningRefinement } from "./persist";
import {
  AdaptationDecisionSchema,
  SYSTEM_PROMPT,
  buildUserPayload,
  mapToRefinement,
  type AdaptationDecisionOutput,
} from "./reasoning";
import type { CandidateDecision, EngineInput } from "./types";

export async function refineWithClaude(
  decision: CandidateDecision,
  input: EngineInput
): Promise<ReasoningRefinement | null> {
  // no_change has nothing to refine — skip the API call.
  if (decision.action === "no_change") return null;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });
  const userPayload = buildUserPayload(decision, input);

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
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
                "Refine rule-layerens beslutning baseret på medlemmets snapshot. Returnér via submit_decision.\n\n" +
                userPayload,
            },
          ],
        },
      ],
      output_config: {
        format: zodOutputFormat(AdaptationDecisionSchema),
      },
    });

    const out: AdaptationDecisionOutput | null = response.parsed_output;
    if (!out) {
      // Silent null here was the OB-1..8 mystery: refined:0 in cron
      // summaries with no warn output. Now we capture enough to
      // diagnose in Vercel logs if it ever happens again.
      const firstBlock = response.content?.[0];
      const blockType = firstBlock?.type ?? "none";
      const preview =
        firstBlock?.type === "text"
          ? firstBlock.text?.slice(0, 140)
          : JSON.stringify(firstBlock)?.slice(0, 140);
      console.warn(
        `[adaptive/reasoning-claude] parsed_output=null stop=${response.stop_reason} block=${blockType} preview=${preview}`
      );
      return null;
    }

    const mapped = mapToRefinement(out);
    if (!mapped) {
      console.warn(
        `[adaptive/reasoning-claude] mapToRefinement returned null for action=${out.final_action}`
      );
    }
    return mapped;
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.warn(
        `[adaptive/reasoning-claude] Anthropic API error ${err.status}: ${err.message}`
      );
    } else {
      console.warn("[adaptive/reasoning-claude] Failed:", err);
    }
    return null;
  }
}
