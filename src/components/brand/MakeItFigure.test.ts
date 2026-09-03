/**
 * MakeItFigure is the brand body-map. Tests lock the AnatomyFigure
 * silhouette, data-domain anchors, v3A organ craft, teaching hierarchy,
 * and the food-only full halo (docs/MAKEIT_FIGURE.md §2).
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import MakeItFigure, {
  ALL_DOMAINS,
  GUT_PATHS,
  GUT_Y_MAX,
  HEART_VOLUME,
  foodAuraFull,
  figureMode,
  pathAbsoluteYs,
} from "./MakeItFigure";
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
    expect(html).toContain('data-craft="v3a"');
    expect(html).not.toContain("makeit-figure-halo");
    expect(html).not.toContain("makeit-figure-halo-glow");
    expect(html).not.toContain("data-highlighted");
    expect(html).not.toContain('data-mode=');
  });

  it("scopes each anchor with data-domain", () => {
    const html = render();
    expect(html).toContain('data-domain="mind"');
    expect(html).toContain('data-domain="heart"');
    expect(html).toContain('data-domain="body"');
    expect(html).toContain('data-domain="food"');
  });

  it("lights only the food gut and a 1px halo plus soft glow when food is the focused highlight", () => {
    const html = render(["food"]);
    expect(html).toContain('data-highlighted="food"');
    expect(html).toContain('data-mode="focus"');
    expect(html).toContain("makeit-figure-food-aura");
    expect(html).toContain('data-food-aura="full"');
    expect(html).toContain("makeit-figure-halo");
    expect(html).toContain("makeit-figure-halo-glow");
    expect(html).toContain("feGaussianBlur");
    expect(html).toMatch(/stroke-width="1"|strokeWidth="1"/);
    expect(html).toMatch(/stroke-width="8"|strokeWidth="8"/);
    expect(html).toContain('data-gut="stomach"');
    expect(html).toContain('data-gut="coil"');
    expect(html).toContain('data-lit="true"');
    expect(html).not.toMatch(/data-domain="mind"[^>]*data-lit/);
  });

  it("lights only the matching region for mind / heart / body — no food halo", () => {
    for (const domain of ["mind", "heart", "body"] as const) {
      const html = render([domain]);
      expect(html).toContain(`data-highlighted="${domain}"`);
      expect(html).toContain('data-mode="focus"');
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

  it("draws an anatomical heart organ — not a valentine glyph or 2× scale", () => {
    const html = render(["heart"]);
    expect(html).toContain('data-heart="organ"');
    expect(html).toContain('data-heart-layer="volume"');
    expect(html).toContain('data-heart-layer="chamber"');
    expect(html).toContain('data-heart-layer="sulcus"');
    expect(html).toContain("makeit-figure-heart-volume");
    expect(html).toContain(HEART_VOLUME.slice(0, 24));
    expect(html).not.toContain('data-heart-scale');
    expect(html).not.toContain("scale(2)");
    expect(html).not.toContain("M388 412c-3.4-2.8");
  });

  it("keeps J-stomach + coils inside the abdomen (no groin escape)", () => {
    for (const d of GUT_PATHS) {
      const ys = pathAbsoluteYs(d);
      expect(ys.length).toBeGreaterThan(0);
      expect(Math.max(...ys)).toBeLessThanOrEqual(GUT_Y_MAX);
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(450);
    }
    const html = render(["food"]);
    expect(html).toContain('data-gut="stomach"');
    expect(html).toContain('data-gut="coil"');
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
    expect(html).toMatch(/data-hotzone="heart"[^>]*rx="80"/);
    expect(html).toMatch(/data-hotzone="food"[^>]*rx="92"/);
  });

  it("teaching state lights all four as a balanced read — ghost food, no full green rim", () => {
    const html = render(["mind", "heart", "body", "food"]);
    expect(html).toContain('data-highlighted="mind heart body food"');
    expect(html).toContain('data-mode="teaching"');
    expect(html).toContain('data-food-aura="ghost"');
    expect(html).not.toContain("makeit-figure-halo");
    expect(html).not.toContain("makeit-figure-halo-glow");
    expect(html).not.toContain("makeit-figure-food-aura");
    expect(html).toMatch(/data-domain="mind"[^>]*data-lit="true"/);
    expect(html).toMatch(/data-domain="heart"[^>]*data-lit="true"/);
    expect(html).toMatch(/data-domain="body"[^>]*data-lit="true"/);
    expect(html).toMatch(/data-domain="food"[^>]*data-lit="true"/);
    expect(html).toContain("var(--steel)");
    expect(html).toContain("var(--fg-faint)");
    expect(html).not.toContain("#3a3a3e");
    expect(html).not.toContain("#1a1a1c");
  });

  it("teaching body is the quietest fill — ghost, not an orange festival", () => {
    const teaching = render(["mind", "heart", "body", "food"]);
    const bodyFocus = render(["body"]);
    expect(teaching).toContain('fill-opacity="0.055"');
    expect(bodyFocus).toContain('fill-opacity="0.1"');
    expect(teaching).not.toContain('fill-opacity="0.22"');
  });
});

describe("figureMode / foodAuraFull", () => {
  it("maps empty / all-four / single to idle / teaching / focus", () => {
    expect(figureMode([])).toBe("idle");
    expect(figureMode(ALL_DOMAINS)).toBe("teaching");
    expect(figureMode(["food"])).toBe("focus");
    expect(figureMode(["mind", "heart"])).toBe("focus");
  });

  it("gives full food aura only when food is on and the figure is not teaching", () => {
    expect(foodAuraFull(["food"])).toBe(true);
    expect(foodAuraFull(ALL_DOMAINS)).toBe(false);
    expect(foodAuraFull(["mind"])).toBe(false);
    expect(foodAuraFull([])).toBe(false);
  });
});
