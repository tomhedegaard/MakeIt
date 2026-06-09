import { describe, expect, it } from "vitest";
import { detectCrisisKeywords } from "./crisis-keywords";

describe("detectCrisisKeywords", () => {
  it("returns clean for normal entries", () => {
    const r = detectCrisisKeywords("Træningen i dag var hård, men jeg er stolt.");
    expect(r.isCrisis).toBe(false);
    expect(r.categories).toEqual([]);
  });

  it("catches Danish suicidal ideation", () => {
    const r = detectCrisisKeywords("Jeg ønsker at dø nogle gange.");
    expect(r.isCrisis).toBe(true);
    expect(r.categories).toContain("suicidal");
  });

  it("catches English suicidal phrasing", () => {
    const r = detectCrisisKeywords("Sometimes I just want to die.");
    expect(r.isCrisis).toBe(true);
    expect(r.categories).toContain("suicidal");
  });

  it("catches Danish hopelessness phrasing as severe", () => {
    const r = detectCrisisKeywords("Jeg orker ikke mere.");
    expect(r.isCrisis).toBe(true);
    expect(r.categories).toContain("severe");
  });

  it("catches self-harm in Danish", () => {
    const r = detectCrisisKeywords("Jeg overvejer at skære i mig selv.");
    expect(r.isCrisis).toBe(true);
    expect(r.categories).toContain("self_harm");
  });

  it("catches multiple categories", () => {
    const r = detectCrisisKeywords("Jeg vil dø og jeg orker ikke mere.");
    expect(r.isCrisis).toBe(true);
    expect(r.categories.length).toBeGreaterThan(1);
  });

  it("returns the literal match for telemetry", () => {
    const r = detectCrisisKeywords("Jeg vil dø");
    expect(r.matches.some((m) => /dø|die/i.test(m))).toBe(true);
  });

  it("doesn't flag a poetic / philosophical line", () => {
    const r = detectCrisisKeywords("Når man ser på naturen, ser man liv overalt.");
    expect(r.isCrisis).toBe(false);
  });
});
