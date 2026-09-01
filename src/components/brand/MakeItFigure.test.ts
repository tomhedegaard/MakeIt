/**
 * MakeItFigure is the brand body-map. Tests lock the AnatomyFigure
 * silhouette, data-domain anchors, and the food-only 1px halo rule.
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
    expect(html).not.toContain("data-highlighted");
  });

  it("scopes each anchor with data-domain", () => {
    const html = render();
    expect(html).toContain('data-domain="mind"');
    expect(html).toContain('data-domain="heart"');
    expect(html).toContain('data-domain="body"');
    expect(html).toContain('data-domain="food"');
  });

  it("lights only the food gut and a 1px halo when food is highlighted", () => {
    const html = render(["food"]);
    expect(html).toContain('data-highlighted="food"');
    expect(html).toContain("makeit-figure-halo");
    expect(html).toMatch(/stroke-width="1"|strokeWidth="1"/);
    expect(html).toContain('data-lit="true"');
    expect(html).not.toMatch(/data-domain="mind"[^>]*data-lit/);
  });

  it("lights only the matching region for mind / heart / body — no food halo", () => {
    for (const domain of ["mind", "heart", "body"] as const) {
      const html = render([domain]);
      expect(html).toContain(`data-highlighted="${domain}"`);
      expect(html).not.toContain("makeit-figure-halo");
      expect(html).toContain(`data-domain="${domain}"`);
    }
  });
});
