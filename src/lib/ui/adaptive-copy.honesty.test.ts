import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const da = JSON.parse(
  readFileSync(new URL("../../../messages/da/Adaptive.json", import.meta.url), "utf8"),
) as { strip: { steps: Record<string, string> }; dots: { cards: Record<string, { sentence: string }> } };
const en = JSON.parse(
  readFileSync(new URL("../../../messages/en/Adaptive.json", import.meta.url), "utf8"),
) as { strip: { steps: Record<string, string> }; dots: { cards: Record<string, { sentence: string }> } };

describe("Adaptive WHY copy — no invented squat / RPE", () => {
  it("sessionToday does not name squat or RPE", () => {
    for (const locale of [da, en]) {
      const line = locale.strip.steps.sessionToday;
      expect(line.toLowerCase()).not.toContain("squat");
      expect(line.toLowerCase()).not.toContain("rpe");
    }
  });
});
