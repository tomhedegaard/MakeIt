import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = readFileSync(new URL("./KalkLanding.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../../../app/page.tsx", import.meta.url), "utf8");

describe("KalkLanding shell", () => {
  it("is a Kalk page scope", () => {
    expect(src).toContain('<ThemeScope theme="kalk"');
  });

  it("renders the eight sections in spec order", () => {
    const order = [
      "<KalkHero", "<MotorStory", "<SystemsBento", "<KalkMunk",
      "<CrewPlates", "<Voices", "<AccessPanel", "<KalkFaq",
    ];
    const at = order.map((tag) => src.indexOf(tag));
    at.forEach((i, n) => expect(i, order[n]).toBeGreaterThan(-1));
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it("is selected by the variant helper on /", () => {
    expect(page).toContain("getLandingVariant()");
    expect(page).toContain("<KalkLanding");
  });
});
