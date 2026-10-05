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

  it("opens four doors to the chapters, each on its own field", () => {
    for (const [href, field] of [["#train", "bg-bg-3"], ["#food", "bg-food-tint"], ["#hrv", "bg-heart-tint"], ["#mind", "bg-mind-tint"]]) {
      expect(html).toMatch(new RegExp(`<a href="${href}"[^>]*${field}`));
    }
    expect(html).not.toMatch(/type="range"/);
  });
});
