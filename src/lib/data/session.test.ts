import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = readFileSync(
  join(process.cwd(), "src/lib/data/session.ts"),
  "utf8",
);

describe("getFullSession library join", () => {
  it("selects demo_asset_url and phases on the exercise library join", () => {
    expect(SRC).toMatch(/demo_asset_url/);
    expect(SRC).toMatch(/phases/);
    expect(SRC).toMatch(/resolveSessionDemoAssetUrl/);
    expect(SRC).toMatch(/parseExercisePhases/);
  });
});
