import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8").replace(/\s+/g, " ");

describe("Kalk motor rig scale (F2)", () => {
  it("defaults to 1 and shrinks on short viewports", () => {
    expect(css).toMatch(/\[data-motor-story\] \{ --rig-s: 1; \}/);
    expect(css).toMatch(/@media \(max-height: 760px\) \{ \[data-theme="kalk"\] \[data-motor-story\] \{ --rig-s: 0\.88; \} \}/);
    expect(css).toMatch(/@media \(max-height: 660px\) \{ \[data-theme="kalk"\] \[data-motor-story\] \{ --rig-s: 0\.76; \} \}/);
  });
});
