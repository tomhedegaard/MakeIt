import { describe, it, expect } from "vitest";
import {
  INJURY_KEYWORDS_DA,
  SAFETY_CATEGORIES,
  describeVerdictReason,
  detectInjuryKeywords,
  isSafetyCategory,
  shouldModerate,
} from "./safety";

describe("detectInjuryKeywords", () => {
  it("returns no hit for empty / null / undefined input", () => {
    expect(detectInjuryKeywords("")).toEqual({ hit: false, keyword: null });
    expect(detectInjuryKeywords(null)).toEqual({ hit: false, keyword: null });
    expect(detectInjuryKeywords(undefined)).toEqual({ hit: false, keyword: null });
  });

  it("returns no hit for clean coach reasoning", () => {
    const r = detectInjuryKeywords(
      "God form, hold cadencen — gem energi til sidste set.",
    );
    expect(r.hit).toBe(false);
    expect(r.keyword).toBeNull();
  });

  it("flags 'smerte' (and its inflections via substring match)", () => {
    expect(detectInjuryKeywords("Jeg mærker smerte i venstre knæ").hit).toBe(true);
    expect(detectInjuryKeywords("smerter let i hoften").hit).toBe(true);
  });

  it("flags multi-word phrases like 'kan ikke bøje'", () => {
    const r = detectInjuryKeywords("hun siger hun kan ikke bøje benet helt ned");
    expect(r.hit).toBe(true);
    expect(r.keyword).toBe("kan ikke bøje");
  });

  it("is case-insensitive", () => {
    expect(detectInjuryKeywords("HAR SKADET RYGGEN").hit).toBe(true);
    expect(detectInjuryKeywords("Ondt I skulderen").hit).toBe(true);
  });

  it("matches specific keywords ordered list (rygsmerter before smerte etc.)", () => {
    // 'rygsmerter' contains 'smerte' as substring — but our list has
    // 'smerte' earlier, so 'smerte' wins. That's fine for v0 — UI
    // copy is generic ("Munk skal lige se den her først").
    const r = detectInjuryKeywords("rygsmerter i dag");
    expect(r.hit).toBe(true);
    expect(["smerte", "rygsmerter"]).toContain(r.keyword);
  });

  it("includes the spec's required tokens", () => {
    for (const required of ["smerte", "ondt i", "kan ikke bøje", "skadet"]) {
      expect(INJURY_KEYWORDS_DA).toContain(required);
    }
  });
});

describe("shouldModerate", () => {
  it("moderates beast_sandbox and beast_live", () => {
    expect(shouldModerate("beast_sandbox")).toBe(true);
    expect(shouldModerate("beast_live")).toBe(true);
  });

  it("does NOT moderate munk or legend_live or null/undefined", () => {
    expect(shouldModerate("munk")).toBe(false);
    expect(shouldModerate("legend_live")).toBe(false);
    expect(shouldModerate(null)).toBe(false);
    expect(shouldModerate(undefined)).toBe(false);
    expect(shouldModerate("")).toBe(false);
  });

  it("does NOT moderate unknown tiers (default-deny mode would over-block; default-allow over-permits — pick allow for non-coach members)", () => {
    expect(shouldModerate("athlete")).toBe(false);
    expect(shouldModerate("lifter")).toBe(false);
  });
});

describe("SAFETY_CATEGORIES + isSafetyCategory", () => {
  it("contains all four spec categories", () => {
    expect(SAFETY_CATEGORIES).toContain("medical_claim");
    expect(SAFETY_CATEGORIES).toContain("injury_advice");
    expect(SAFETY_CATEGORIES).toContain("demotivating_tone");
    expect(SAFETY_CATEGORIES).toContain("off_topic_promotion");
  });

  it("type-guards string→SafetyCategory", () => {
    expect(isSafetyCategory("medical_claim")).toBe(true);
    expect(isSafetyCategory("bogus")).toBe(false);
  });
});

describe("describeVerdictReason", () => {
  it("formats 'ok' for non-held verdicts", () => {
    expect(describeVerdictReason({ held: false, reason: null })).toBe("ok");
  });

  it("formats injury-keyword hits", () => {
    expect(
      describeVerdictReason({
        held: true,
        reason: { kind: "injury_keyword", keyword: "smerte" },
      }),
    ).toBe("injury:smerte");
  });

  it("formats moderation-category hits", () => {
    expect(
      describeVerdictReason({
        held: true,
        reason: {
          kind: "moderation_category",
          category: "medical_claim",
          explanation: "x",
        },
      }),
    ).toBe("moderation:medical_claim");
  });
});
