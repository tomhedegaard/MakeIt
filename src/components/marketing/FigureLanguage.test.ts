/**
 * Marketing figure language — DomainMark kickers + teaching-state
 * MakeItFigure. Locks the public surfaces onto the same silhouette
 * and marks as the dashboard BodyMap (docs/MAKEIT_FIGURE.md).
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import DomainMark, { DOMAINS } from "@/components/brand/DomainMark";
import {
  HERO_DOMAINS,
  MarketingDomainKicker,
  MarketingFigure,
  highlightsForActive,
} from "./FigureLanguage";

function renderKicker(domain: (typeof HERO_DOMAINS)[number]) {
  return renderToStaticMarkup(
    createElement(MarketingDomainKicker, {
      domain,
      label: domain,
    }),
  );
}

describe("MarketingDomainKicker", () => {
  it.each(HERO_DOMAINS)(
    "uses DomainMark for %s — not a generic colored dot",
    (domain) => {
      const html = renderKicker(domain);
      expect(html).toContain('data-domain="' + domain + '"');
      expect(html).toContain("domain-mark");
      expect(html).toContain("domain-mark--" + domain);
      expect(html).toContain("eyebrow-domain");
      expect(html).not.toContain("rounded-full");
      expect(html).not.toContain("bg-domain");
      expect(html).not.toContain("size-1.5");
    },
  );

  it("keeps the locked hero order body → food → heart → mind", () => {
    expect(HERO_DOMAINS).toEqual(["body", "food", "heart", "mind"]);
  });
});

describe("MarketingFigure", () => {
  it("is the locked MakeItFigure in the four-domain teaching state", () => {
    const html = renderToStaticMarkup(
      createElement(MarketingFigure, { ariaLabel: "body-map" }),
    );
    expect(html).toContain("makeit-figure");
    expect(html).toContain('data-highlighted="mind heart body food"');
    expect(html).toContain("makeit-figure-halo");
    expect(html).toContain("makeit-figure-halo-glow");
    expect(html).toContain('aria-label="body-map"');
    for (const domain of DOMAINS) {
      expect(html).toMatch(
        new RegExp(`data-domain="${domain}"[^>]*data-lit="true"`),
      );
    }
    expect(html).toContain("var(--steel)");
    expect(html).not.toContain("#3a3a3e");
  });

  it("reuses DomainMark glyphs — no second icon set", () => {
    const mark = renderToStaticMarkup(
      createElement(DomainMark, { domain: "body" }),
    );
    const kicker = renderKicker("body");
    expect(kicker).toContain("domain-mark--body");
    expect(mark).toContain("domain-mark--body");
  });
});

describe("highlightsForActive", () => {
  it("defaults to the four-domain teaching state", () => {
    expect(highlightsForActive(null)).toEqual(DOMAINS);
  });

  it.each(HERO_DOMAINS)("selecting %s lights only that domain", (domain) => {
    expect(highlightsForActive(domain)).toEqual([domain]);
  });
});
