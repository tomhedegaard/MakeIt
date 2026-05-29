import { describe, it, expect } from "vitest";
import {
  draftOverlapRatio,
  draftedByAi,
  DRAFT_OVERLAP_THRESHOLD,
} from "./draft-overlap";

describe("draftOverlapRatio", () => {
  it("returns 1 for identical strings", () => {
    const s = "Stærkt løft. Lås ud med ballerne, ikke ved at læne tilbage.";
    expect(draftOverlapRatio(s, s)).toBe(1);
  });

  it("returns 1 when both are empty (degenerate)", () => {
    expect(draftOverlapRatio("", "")).toBe(1);
  });

  it("returns 0 when one side is empty", () => {
    expect(draftOverlapRatio("noget tekst", "")).toBe(0);
    expect(draftOverlapRatio("", "noget tekst")).toBe(0);
  });

  it("is symmetric", () => {
    const a = "Skub bagdelen mod væggen. Hofterne bagud.";
    const b = "Skub bagdelen mod muren. Hofterne tilbage.";
    expect(draftOverlapRatio(a, b)).toBeCloseTo(draftOverlapRatio(b, a), 10);
  });

  it("stays high (>=0.7) for a light inline edit", () => {
    const draft =
      "Stærkt løft. Lås ud med squeeze i ballerne, ikke ved at læne tilbage. Tænk stå op næste gang.";
    // Munk fixes one word + adds a short clause — most of the draft survives.
    const sent =
      "Stærkt løft. Lås ud med squeeze i ballerne, ikke ved at læne tilbage. Tænk stå op til næste session.";
    expect(draftOverlapRatio(draft, sent)).toBeGreaterThanOrEqual(0.7);
  });

  it("drops below 0.7 for a heavy rewrite", () => {
    const draft =
      "Stærkt løft. Lås ud med squeeze i ballerne, ikke ved at læne tilbage. Tænk stå op.";
    const sent =
      "Helt anderledes svar fra bunden. Kig på dit setup og film forfra næste gang, tak.";
    expect(draftOverlapRatio(draft, sent)).toBeLessThan(0.7);
  });

  it("returns ~0 for a complete rewrite with no shared structure", () => {
    expect(
      draftOverlapRatio("aaaaaaaaaa", "bbbbbbbbbb")
    ).toBeLessThan(0.2);
  });
});

describe("draftedByAi", () => {
  it("is true when sent stays at/above the overlap threshold", () => {
    const draft = "Solid pause-bench. Kontrollér ekscentrisk lidt mere næste gang.";
    const sent = "Solid pause-bench. Kontrollér ekscentrisk lidt mere til næste gang.";
    expect(draftOverlapRatio(draft, sent)).toBeGreaterThanOrEqual(
      DRAFT_OVERLAP_THRESHOLD
    );
    expect(draftedByAi(draft, sent)).toBe(true);
  });

  it("is false when the coach rewrites most of the draft", () => {
    const draft = "Solid pause-bench. Kontrollér ekscentrisk lidt mere.";
    const sent = "Film forfra næste gang — jeg kan ikke se dine fødder her.";
    expect(draftedByAi(draft, sent)).toBe(false);
  });

  it("is false when there is no draft", () => {
    expect(draftedByAi(null, "en helt manuel coach-note")).toBe(false);
    expect(draftedByAi("", "en helt manuel coach-note")).toBe(false);
  });

  it("is false when nothing was sent", () => {
    expect(draftedByAi("et udkast fra Claude", "")).toBe(false);
  });
});
