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

  it("does not render May challenge or Open House as live when connected", () => {
    expect(page).toContain("Monthly challenge hero — demo only");
    expect(page).toContain("IRL meet — demo fixture only");
    expect(page).toMatch(
      /\{\/\* Monthly challenge hero — demo only[\s\S]*?\{\!SUPABASE_ENABLED \? \(/,
    );
    expect(page).toMatch(
      /\{\/\* IRL meet — demo fixture only[\s\S]*?\{\!SUPABASE_ENABLED \? \(/,
    );
    expect(page).toContain("challengeEmptyTitle");
    expect(page).toContain("meetEmptyTitle");
    expect(page).toContain("meetEmptyBody");
  });
});
