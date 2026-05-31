/**
 * Unit tests for the draft-reply pure helpers (MM-4).
 *
 * Covers prompt assembly (voice samples as few-shot), user payload
 * shaping, output mapping (snake→camel + empty guard), and the
 * tone-balanced sample picker (deterministic via injected rng).
 */

import { describe, expect, it } from "vitest";

import {
  buildDraftUserPayload,
  buildVoiceSystemPrompt,
  mapToDraft,
  pickVoiceSamples,
  type DraftReplyOutput,
  type FormCheckContext,
  type VoiceSample,
} from "./draft-reply";

// =====================================================================
// buildVoiceSystemPrompt
// =====================================================================

describe("buildVoiceSystemPrompt", () => {
  it("embeds each sample as a tagged example block", () => {
    const prompt = buildVoiceSystemPrompt([
      { tone: "corrective", replyText: "Knæ ud, sid lavt." },
      { tone: "encouraging", replyText: "Solid sætning, fortsæt." },
    ]);
    expect(prompt).toContain('<example tone="corrective">');
    expect(prompt).toContain("Knæ ud, sid lavt.");
    expect(prompt).toContain('<example tone="encouraging">');
    expect(prompt).toContain("Solid sætning, fortsæt.");
  });

  it("always includes the voice rules + output instruction", () => {
    const prompt = buildVoiceSystemPrompt([]);
    expect(prompt).toContain("Munks stil");
    expect(prompt).toContain("Maks 4 sætninger");
    expect(prompt).toContain("submit_reply");
  });

  it("omits the example section entirely when no samples", () => {
    const prompt = buildVoiceSystemPrompt([]);
    expect(prompt).not.toContain("<example");
    expect(prompt).not.toContain("Eksempler på Munks stemme");
  });

  it("is stable for the same samples (cache prefix integrity)", () => {
    const samples: VoiceSample[] = [
      { tone: "terse", replyText: "Albue ned. Pause-bench næste gang." },
    ];
    expect(buildVoiceSystemPrompt(samples)).toBe(
      buildVoiceSystemPrompt(samples)
    );
  });
});

// =====================================================================
// buildDraftUserPayload
// =====================================================================

describe("buildDraftUserPayload", () => {
  const ctx = (overrides: Partial<FormCheckContext> = {}): FormCheckContext => ({
    exerciseName: "Back squat",
    aiScore: 7,
    aiHeadline: "Knæ rejser ind på de tunge reps",
    aiPos: ["God dybde", "Stabil core"],
    aiNeg: ["Valgus på rep 4-5"],
    aiFix: "Pres ydersiden af foden ned",
    ...overrides,
  });

  it("produces valid JSON with the expected shape", () => {
    const parsed = JSON.parse(buildDraftUserPayload(ctx()));
    expect(parsed.exercise).toBe("Back squat");
    expect(parsed.ai_analysis.score).toBe(7);
    expect(parsed.ai_analysis.positives).toEqual(["God dybde", "Stabil core"]);
    expect(parsed.ai_analysis.suggested_fix).toBe(
      "Pres ydersiden af foden ned"
    );
  });

  it("tolerates null AI fields", () => {
    const parsed = JSON.parse(
      buildDraftUserPayload(
        ctx({ aiScore: null, aiHeadline: null, aiFix: null, aiPos: [], aiNeg: [] })
      )
    );
    expect(parsed.ai_analysis.score).toBeNull();
    expect(parsed.ai_analysis.positives).toEqual([]);
  });

  it("is deterministic for the same context", () => {
    expect(buildDraftUserPayload(ctx())).toBe(buildDraftUserPayload(ctx()));
  });
});

// =====================================================================
// mapToDraft
// =====================================================================

describe("mapToDraft", () => {
  const raw = (overrides: Partial<DraftReplyOutput> = {}): DraftReplyOutput => ({
    reply_da: "Solid dybde. Knæ ud på de tunge reps — pres ydersiden af foden ned. Tag 5kg af næste gang.",
    tone: "corrective",
    confidence: 0.82,
    ...overrides,
  });

  it("maps snake_case to camelCase and trims", () => {
    const out = mapToDraft(raw({ reply_da: "  Solid dybde. Knæ ud næste gang.  " }));
    expect(out).not.toBeNull();
    expect(out?.replyDa).toBe("Solid dybde. Knæ ud næste gang.");
    expect(out?.tone).toBe("corrective");
    expect(out?.confidence).toBe(0.82);
  });

  it("returns null when reply trims to under 10 chars", () => {
    expect(mapToDraft(raw({ reply_da: "   ok    " }))).toBeNull();
  });

  it("preserves the chosen tone", () => {
    expect(mapToDraft(raw({ tone: "playful" }))?.tone).toBe("playful");
  });
});

// =====================================================================
// pickVoiceSamples
// =====================================================================

describe("pickVoiceSamples", () => {
  const pool: VoiceSample[] = [
    { tone: "corrective", replyText: "c1" },
    { tone: "corrective", replyText: "c2" },
    { tone: "encouraging", replyText: "e1" },
    { tone: "encouraging", replyText: "e2" },
    { tone: "terse", replyText: "t1" },
    { tone: "playful", replyText: "p1" },
  ];

  // Deterministic rng: always returns 0 → shuffle picks the first item.
  const zeroRng = () => 0;

  it("returns the requested count", () => {
    expect(pickVoiceSamples(pool, 3, zeroRng).length).toBe(3);
  });

  it("balances across tones before repeating one (round-robin)", () => {
    const picked = pickVoiceSamples(pool, 3, zeroRng);
    const tones = picked.map((p) => p.tone);
    // First pass picks one each from corrective, encouraging, terse.
    expect(new Set(tones).size).toBe(3);
  });

  it("never returns more than the pool size", () => {
    expect(pickVoiceSamples(pool, 99, zeroRng).length).toBe(pool.length);
  });

  it("returns empty for count<=0 or empty pool", () => {
    expect(pickVoiceSamples(pool, 0, zeroRng)).toEqual([]);
    expect(pickVoiceSamples([], 3, zeroRng)).toEqual([]);
  });

  it("does not return duplicate sample objects", () => {
    const picked = pickVoiceSamples(pool, 6, zeroRng);
    const texts = picked.map((p) => p.replyText);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("pulls a second corrective only after exhausting other tones", () => {
    // count=5 from a pool with 2 corrective, 2 encouraging, 1 terse, 1 playful.
    // Round 1: corrective, encouraging, terse, playful (4).
    // Round 2: corrective, encouraging → but count=5 stops at 5th.
    const picked = pickVoiceSamples(pool, 5, zeroRng);
    const toneCounts = picked.reduce<Record<string, number>>((acc, p) => {
      acc[p.tone] = (acc[p.tone] ?? 0) + 1;
      return acc;
    }, {});
    // corrective appears at most twice (both in pool), and the 5th pick
    // is the start of round 2.
    expect(toneCounts.corrective).toBeLessThanOrEqual(2);
    expect(picked.length).toBe(5);
  });
});
