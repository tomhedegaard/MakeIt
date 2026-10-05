import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = readFileSync(new URL("./LandingPage.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../../../app/page.tsx", import.meta.url), "utf8");

describe("LandingPage shell", () => {
  it("is a Kalk page scope", () => {
    expect(src).toContain('<ThemeScope theme="nord"');
  });

  it("renders the sections in order", () => {
    const order = [
      "<LandingHero", "<ChapterTrain", "<ChapterFood", "<ChapterHeart", "<MotorStory",
      "<ChapterMind", "<AppRack", "<CrewAlone", "<CrewPlates", "<LandingMunk",
      "<Voices", "<AccessPanel", "<LandingFaq",
    ];
    const at = order.map((tag) => src.indexOf(tag));
    at.forEach((i, n) => expect(i, order[n]).toBeGreaterThan(-1));
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it("is rendered unconditionally on / with a light viewport", () => {
    expect(page).toContain("return <LandingPage />");
    expect(page).not.toMatch(/getLandingVariant|LANDING_VARIANT|ClassicLanding/);
    expect(page).toMatch(/export const viewport[^=]*=\s*\{[^}]*themeColor:\s*"#FFFFFF"/);
    expect(page).toMatch(/colorScheme:\s*"light"/);
  });
});
