import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dir = new URL("./", import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith(".tsx") && !f.includes(".test."));
const sources = files.map((f) => [f, readFileSync(new URL(f, dir), "utf8")] as const);
const phoneDir = new URL("../phone/screens/", import.meta.url);
const screens = [
  ...readdirSync(phoneDir).map((f) => [f, readFileSync(new URL(f, phoneDir), "utf8")] as const),
  ["PhoneFrame.tsx", readFileSync(new URL("../phone/PhoneFrame.tsx", import.meta.url), "utf8")] as const,
];

describe("Kalk landing source gates (plan F2 regler)", () => {
  it.each([...sources, ...screens])("%s has no hardcoded colours", (_f, src) => {
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(src).not.toMatch(/rgba?\(/);
    expect(src).not.toMatch(/\b(bg|text|border)-(white|black|red|blue|green|orange|gray|zinc|slate)-?\d*/);
  });

  it.each(sources)("%s uses no drawn exercise figures", (_f, src) => {
    expect(src).not.toMatch(/\bstick-?figure\b|pindefigur/i);
  });

  it("spends at most three eyebrows on the page", () => {
    const count = sources.reduce((n, [, s]) => n + (s.match(/className="[^"]*\beyebrow\b/g)?.length ?? 0), 0);
    expect(count).toBeLessThanOrEqual(3);
  });

  it("has no custom cursor, spotlight or marquee", () => {
    const all = sources.map(([, s]) => s).join("\n");
    expect(all).not.toMatch(/CustomCursor|Spotlight|Marquee/);
  });
});
