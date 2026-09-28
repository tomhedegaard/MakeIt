import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The matcher is a static string in src/middleware.ts; read it from
// source so the test does not pull the Supabase client into node.
const src = readFileSync(new URL("../../middleware.ts", import.meta.url), "utf8");
const pattern = JSON.parse(src.match(/matcher:\s*\[\s*(?:\/\/.*\n\s*)*("[^"]+")/)![1]) as string;
const matches = (path: string) => new RegExp(`^${pattern}$`).test(path);

describe("middleware matcher", () => {
  it("still gates app routes", () => {
    expect(matches("/dashboard")).toBe(true);
    expect(matches("/session/abc")).toBe(true);
  });

  it("lets public exercise loops through, so the landing can play them logged out", () => {
    expect(matches("/exercise-demos/back-squat.webm")).toBe(false);
    expect(matches("/exercise-demos/back-squat.mp4")).toBe(false);
    expect(matches("/exercise-demos/back-squat-poster.jpg")).toBe(false);
  });
});
