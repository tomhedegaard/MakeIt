/**
 * Integration smoke test for generatePracticeEval. Mocks `server-only`
 * so the wrapper runs in Node, then calls the real Anthropic SDK.
 *
 * Skipped unless RUN_PRACTICE_EVAL_SMOKE=1 — don't burn API credits on
 * every npm test. Run on demand:
 *
 *   RUN_PRACTICE_EVAL_SMOKE=1 ANTHROPIC_API_KEY=... \
 *     npx vitest run src/lib/coach-school/practice-eval-claude.smoke.test.ts
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { generatePracticeEval } from "./practice-eval-claude";

const RUN = process.env.RUN_PRACTICE_EVAL_SMOKE === "1";

const RUBRIC = `
Lærlingen skal vise:
  - At de fanger det vigtigste form-cue (knæ-valgus på squat).
  - At de leverer cue'et som ÉN konkret instruktion, ikke en liste.
  - At de IKKE bruger AI-jargon ("score", "percentile") eller fokuserer
    på tallene fremfor bevægelsen.
'strong' = alle tre. 'on_track' = de første to. 'needs_work' = ingen.
`.trim();

describe.skipIf(!RUN)("generatePracticeEval — real SDK smoke", () => {
  it("returns a non-null eval with feedback in Danish", async () => {
    const result = await generatePracticeEval({
      rubric: RUBRIC,
      scenarioPrompt:
        "Du ser et form-check med ai_score 6 og bullet 'knæene falder ind på rep 4-5'. Hvad er din coach-note?",
      memberResponse:
        "Pres ydersiden af foden i gulvet og knæ ud. Tag 5kg af næste session.",
    });
    console.log("[smoke] eval:", JSON.stringify(result, null, 2));
    expect(result).not.toBeNull();
    expect(result?.feedback_da.length).toBeGreaterThan(10);
    expect(["needs_work", "on_track", "strong"]).toContain(result?.score);
  });
});

describe("practice-eval smoke harness sanity", () => {
  it("vi.mock('server-only') unblocks the wrapper import", () => {
    expect(typeof generatePracticeEval).toBe("function");
  });
});
