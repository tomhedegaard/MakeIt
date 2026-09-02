/**
 * MakeItFigure is the brand body-map. Tests lock the AnatomyFigure
 * silhouette, data-domain anchors, v2 organ scale, and the food-only
 * 1px halo + soft glow recipe (docs/MAKEIT_FIGURE.md §2).
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import MakeItFigure from "./MakeItFigure";
import { OUTLINES, VIEWBOX } from "@/lib/data/anatomy/paths";

function render(highlightedDomains: Array<"mind" | "heart" | "body" | "food"> = []) {
  return renderToStaticMarkup(
    createElement(MakeItFigure, {
      highlightedDomains,
      ariaLabel: "body-map",
    })
  );
}

describe("MakeItFigure", () => {
  it("traces the AnatomyFigure male-front silhouette", () => {
    const html = render();
    expect(html).toContain("makeit-figure");
    expect(html).toContain(`viewBox="${VIEWBOX.male.front}"`);
    expect(html).toContain(OUTLINES.male.front.slice(0, 24));
    expect(html).toContain("makeit-figure-outline");
    expect(html).not.toContain("makeit-figure-halo");
    expect(html).not.toContain("makeit-figure-halo-glow");
    expect(html).not.toContain("data-highlighted");
  });

  it("scopes each anchor with data-domain", () => {
    const html = render();
    expect(html).toContain('data-domain="mind"');
    expect(html).toContain('data-domain="heart"');
    expect(html).toContain('data-domain="body"');
    expect(html).toContain('data-domain="food"');
  });

  it("lights only the food gut and a 1px halo plus soft glow when food is highlighted", () => {
    const html = render(["food"]);
    expect(html).toContain('data-highlighted="food"');
    expect(html).toContain("makeit-figure-food-aura");
    expect(html).toContain("makeit-figure-halo");
    expect(html).toContain("makeit-figure-halo-glow");
    expect(html).toContain("feGaussianBlur");
    expect(html).toMatch(/stroke-width="1"|strokeWidth="1"/);
    expect(html).toMatch(/stroke-width="22"|strokeWidth="22"/);
    expect(html).toContain('data-gut="stomach"');
    expect(html).toContain('data-gut="coil"');
    expect(html).toContain('data-lit="true"');
    expect(html).not.toMatch(/data-domain="mind"[^>]*data-lit/);
  });

  it("lights only the matching region for mind / heart / body — no food halo", () => {
    for (const domain of ["mind", "heart", "body"] as const) {
      const html = render([domain]);
      expect(html).toContain(`data-highlighted="${domain}"`);
      expect(html).not.toContain("makeit-figure-halo");
      expect(html).not.toContain("makeit-figure-halo-glow");
      expect(html).toContain(`data-domain="${domain}"`);
    }
  });

  it("lights body via AnatomyFigure muscle parts, not overlay stick-man segments", () => {
    const html = render(["body"]);
    expect(html).toContain('data-muscle="quadriceps"');
    expect(html).toContain('data-muscle="deltoids"');
    expect(html).toContain('data-muscle="chest"');
    expect(html).not.toContain("M362 248");
    expect(html).not.toContain('data-muscle="abs"');
    expect(html).not.toContain('data-muscle="head"');
  });

  it("keeps the kinetic chain faintly present when body is unlit", () => {
    const html = render(["food"]);
    expect(html).toContain('data-muscle="quadriceps"');
    expect(html).toContain('data-muscle="chest"');
    expect(html).not.toMatch(/data-domain="body"[^>]*data-lit/);
  });

  it("scales the heart ~1.85× so it reads as a chest organ", () => {
    const html = render(["heart"]);
    expect(html).toContain('data-heart-scale="1.85"');
    expect(html).toContain("scale(1.85)");
  });

  it("adds SVG hot-zones only when onDomainHover is provided", () => {
    const idle = render();
    expect(idle).not.toContain("makeit-figure-hotzones");
    expect(idle).not.toContain("data-hotzone");

    const html = renderToStaticMarkup(
      createElement(MakeItFigure, {
        highlightedDomains: ["mind", "heart", "body", "food"],
        ariaLabel: "body-map",
        onDomainHover: () => {},
      }),
    );
    expect(html).toContain("makeit-figure-hotzones");
    expect(html).toContain('data-hotzone="body"');
    expect(html).toContain('data-hotzone="food"');
    expect(html).toContain('data-hotzone="heart"');
    expect(html).toContain('data-hotzone="mind"');
    expect(html).toMatch(/data-hotzone="heart"[^>]*rx="72"/);
    expect(html).toMatch(/data-hotzone="food"[^>]*rx="108"/);
  });

  it("teaching state lights all four anchors and the food halo", () => {
    const html = render(["mind", "heart", "body", "food"]);
    expect(html).toContain('data-highlighted="mind heart body food"');
    expect(html).toContain("makeit-figure-halo");
    expect(html).toContain("makeit-figure-halo-glow");
    expect(html).toMatch(/data-domain="mind"[^>]*data-lit="true"/);
    expect(html).toMatch(/data-domain="heart"[^>]*data-lit="true"/);
    expect(html).toMatch(/data-domain="body"[^>]*data-lit="true"/);
    expect(html).toMatch(/data-domain="food"[^>]*data-lit="true"/);
    expect(html).toContain("var(--steel)");
    expect(html).toContain("var(--fg-faint)");
    expect(html).not.toContain("#3a3a3e");
    expect(html).not.toContain("#1a1a1c");
  });
});
