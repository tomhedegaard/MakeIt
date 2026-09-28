import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("program detail start CTA", () => {
  it("surfaces Start Program and disables it when the blueprint is empty", () => {
    expect(page).toContain("StartProgramButton");
    expect(page).toContain("hasDays={program.days.length > 0}");
    expect(page).toContain("emptyDays");
  });
});
