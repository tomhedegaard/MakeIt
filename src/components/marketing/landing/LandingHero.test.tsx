import { describe, expect, it } from "vitest";
import { render } from "../test-render";
import LandingHero from "./LandingHero";

const html = render(<LandingHero />);

describe("LandingHero", () => {
  it("carries the Danish H1", () => {
    expect(html).toMatch(/<h1[^>]*>[^<]*Bygget til dem der løfter\.[^<]*<\/h1>/);
  });

  it("has exactly one primary button", () => {
    expect(html.match(/btn-primary/g)).toHaveLength(1);
  });

  it("has no eyebrow and no stats band", () => {
    expect(html).not.toContain("eyebrow");
    expect(html).not.toContain("data-stats");
  });

  it("beholder H1 og den ene sætning", () => {
    expect(html).toContain("Bygget til dem der løfter.");
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
  });

  it("viser topsættet skrevet om på kg-linealen, uden skydere", () => {
    expect(html).toContain("hero-scale");
    expect(html).toContain("Back squat, topsæt: 150 kg skrevet om til 135 kg.");
    expect(html).not.toMatch(/type="range"/);
  });
});
