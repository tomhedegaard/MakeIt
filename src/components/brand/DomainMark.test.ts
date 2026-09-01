/**
 * DomainMark is presentational stroke SVG. These tests lock the
 * 24px / currentColor / data-domain contract so a future Lucide
 * swap cannot land unnoticed.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import DomainMark, { DOMAINS } from "./DomainMark";

function render(domain: (typeof DOMAINS)[number]) {
  return renderToStaticMarkup(createElement(DomainMark, { domain }));
}

describe("DomainMark", () => {
  it.each(DOMAINS)("renders the %s mark with data-domain and domain class", (domain) => {
    const html = render(domain);
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html).toContain('data-domain="' + domain + '"');
    expect(html).toContain("domain-mark");
    expect(html).toContain("domain-mark--" + domain);
    expect(html).toContain("currentColor");
    expect(html).toMatch(/stroke-width="1\.6"|strokeWidth="1\.6"/);
  });

  it("does not render a filled bowl / barbell / bulb for food, body, mind", () => {
    const food = render("food");
    const body = render("body");
    const mind = render("mind");
    // Food is a gut glyph — no bowl hemisphere (the old tab icon).
    expect(food).not.toContain("M3 12h18a9 9");
    // Body is a kinetic-chain fragment — no barbell plates.
    expect(body).not.toContain('x="2" y="9"');
    // Mind is a head — no lightbulb filament.
    expect(mind).not.toContain("M12 11v3");
  });
});
