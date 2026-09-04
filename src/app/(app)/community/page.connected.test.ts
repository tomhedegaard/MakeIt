import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("community connected first-run", () => {
  it("does not hardcode 68.4 / 100K in the page", () => {
    expect(page).not.toMatch(/68\.4\s*\/\s*100K/);
    expect(page).not.toMatch(/width:\s*"68\.4%"/);
    expect(page).toContain("communityChallengeProgress");
  });

  it("gates mock stories and leaderboard behind demo", () => {
    expect(page).toContain("STORIES.map");
    expect(page).toContain("LEADERBOARD.map");
    expect(page).toContain("{!useReal ? (");
    expect(page).toContain("Story strip — demo only");
    expect(page).toContain("Leaderboard — demo only");
  });
});
