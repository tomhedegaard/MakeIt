import { describe, it, expect } from "vitest";
import {
  buildPracticeSystemPrompt,
  buildPracticeUserPayload,
  mapToPracticeEval,
  type PracticeEvalOutput,
} from "./practice-eval";

describe("buildPracticeSystemPrompt", () => {
  it("inlines the rubric so it lands in the cached prefix", () => {
    const rubric = "Lærlingen skal fange knæ-valgus uden at bruge tal-jargon.";
    const system = buildPracticeSystemPrompt(rubric);
    expect(system).toContain(rubric);
    expect(system).toMatch(/# Rubric/);
    // submit_eval tool reference must survive — the wrapper relies on it.
    expect(system).toMatch(/submit_eval/);
  });

  it("trims the rubric so trailing whitespace doesn't bleed into the prompt", () => {
    const rubric = "   important rule   \n";
    const system = buildPracticeSystemPrompt(rubric);
    expect(system).toContain("important rule");
    expect(system.endsWith("important rule")).toBe(true);
  });
});

describe("buildPracticeUserPayload", () => {
  it("emits deterministic JSON with the three required fields", () => {
    const payload = buildPracticeUserPayload({
      rubric: "ignored at this layer",
      scenarioPrompt: "Hvad er din coach-note?",
      scenarioContext: "Medlem er på uge 4 af Build Phase",
      memberResponse: "Pres ydersiden af foden i gulvet, knæ ud.",
    });
    const parsed = JSON.parse(payload);
    expect(parsed).toEqual({
      scenario_prompt: "Hvad er din coach-note?",
      scenario_context: "Medlem er på uge 4 af Build Phase",
      member_response: "Pres ydersiden af foden i gulvet, knæ ud.",
    });
  });

  it("normalises a missing context to null", () => {
    const payload = buildPracticeUserPayload({
      rubric: "x",
      scenarioPrompt: "p",
      memberResponse: "r",
    });
    expect(JSON.parse(payload).scenario_context).toBeNull();
  });
});

describe("mapToPracticeEval", () => {
  const valid: PracticeEvalOutput = {
    score: "on_track",
    feedback_da: "Solid retning — sætningen rammer kernen, men strammere på cue'et næste gang.",
    specific_strength: "Du tog kernepunktet først.",
    specific_improvement: "Skær AI-jargon — sig hvad medlem skal gøre.",
  };

  it("passes a valid eval through with trimmed feedback", () => {
    const out = mapToPracticeEval({ ...valid, feedback_da: `  ${valid.feedback_da}  ` });
    expect(out?.feedback_da).toBe(valid.feedback_da);
    expect(out?.score).toBe("on_track");
    expect(out?.specific_strength).toBe(valid.specific_strength);
  });

  it("returns null when the feedback collapses to fewer than 10 chars after trim", () => {
    const out = mapToPracticeEval({
      score: "needs_work",
      // Note: zod accepted this (10..280) at schema time, but a Claude
      // pathology could emit "         OK" → 2-char useful payload.
      // Schema would actually reject <10 already — mapper is the
      // belt-and-braces guard. Test with an exactly-10 string that's
      // all whitespace.
      feedback_da: "          ",
      specific_strength: "x",
    } as PracticeEvalOutput);
    expect(out).toBeNull();
  });

  it("drops empty-after-trim optional fields", () => {
    const out = mapToPracticeEval({
      ...valid,
      specific_strength: "   ",
      specific_improvement: undefined,
    });
    expect(out?.specific_strength).toBeUndefined();
    expect(out?.specific_improvement).toBeUndefined();
  });
});
