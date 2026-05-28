/**
 * Integration smoke test for generateDraftReply. Mocks `server-only`
 * so the wrapper runs in Node, then calls the real Anthropic SDK.
 *
 * Skipped unless RUN_DRAFT_SMOKE=1 — don't burn API credits on every
 * npm test. Run on demand:
 *
 *   RUN_DRAFT_SMOKE=1 ANTHROPIC_API_KEY=... \
 *     npx vitest run src/lib/coach/draft-reply-claude.smoke.test.ts
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { generateDraftReply } from "./draft-reply-claude";
import type { FormCheckContext, VoiceSample } from "./draft-reply";

const RUN = process.env.RUN_DRAFT_SMOKE === "1";

const voiceSamples: VoiceSample[] = [
  {
    tone: "corrective",
    replyText:
      "Knæene rejser ind på de tunge reps. Pres ydersiden af foden i gulvet og knæ ud. Tag 5kg af næste session og kør 5x5 med fokus på det.",
  },
  {
    tone: "encouraging",
    replyText:
      "Sætningen er solid. Hofte og skulder kommer op samtidigt, baren tæt. Tilføj 2.5kg næste gang.",
  },
  {
    tone: "terse",
    replyText: "Albue for høj på rep 3. Skulderblade ned. Næste: pause-bench 3x5.",
  },
];

const formCheck: FormCheckContext = {
  exerciseName: "Back squat",
  aiScore: 7,
  aiHeadline: "Valgus på de tunge reps",
  aiPos: ["God dybde", "Stabil torso"],
  aiNeg: ["Knæ rejser ind på rep 4-5"],
  aiFix: "Pres ydersiden af foden ned, knæ ud",
};

describe.skipIf(!RUN)("generateDraftReply — real SDK smoke", () => {
  it("returns a non-null draft in Munk's voice", async () => {
    const result = await generateDraftReply({ formCheck, voiceSamples });
    console.log("[smoke] draft:", JSON.stringify(result, null, 2));
    expect(result).not.toBeNull();
    expect(result?.replyDa.length).toBeGreaterThan(10);
    expect(["encouraging", "corrective", "terse", "playful"]).toContain(
      result?.tone
    );
    expect(result?.confidence).toBeGreaterThan(0);
    // Voice rule: no percentages in the member-facing copy.
    expect(result?.replyDa).not.toMatch(/\d+\s*%/);
  });
});

describe("draft smoke harness sanity", () => {
  it("vi.mock('server-only') unblocks the wrapper import", () => {
    expect(typeof generateDraftReply).toBe("function");
  });
});
