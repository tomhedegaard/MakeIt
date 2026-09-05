/**
 * DomainMark is presentational stroke SVG. These tests lock the
 * 24px / currentColor / data-domain contract and the v3A.2 organ
 * language so a valentine / balloon / Lucide swap cannot land unnoticed.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import DomainMark, {
  DOMAINS,
  MARK_GUT_COILS,
  MARK_GUT_ESOPHAGUS,
  MARK_GUT_STOMACH,
  MARK_HEART_AORTA,
  MARK_HEART_PULM,
  MARK_HEART_VOLUME,
} from "./DomainMark";

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
    expect(food).not.toContain("M3 12h18a9 9");
    expect(body).not.toContain('x="2" y="9"');
    expect(mind).not.toContain("M12 11v3");
  });

  it("draws an anatomical heart — fist + two vessel stubs, not a valentine", () => {
    const html = render("heart");
    expect(html).toContain('data-heart="organ"');
    expect(html).toContain('data-heart-layer="volume"');
    expect(html).toContain('data-heart-layer="aorta"');
    expect(html).toContain('data-heart-layer="pulm"');
    expect(html).toContain('data-heart-layer="sulcus"');
    expect(html).toContain(MARK_HEART_VOLUME);
    expect(html).toContain(MARK_HEART_AORTA);
    expect(html).toContain(MARK_HEART_PULM);
    // v3A.1 valentine / peach
    expect(html).not.toContain("M12 19.2S5.6 14.3");
    expect(html).not.toContain("M12 19.2");
  });

  it("draws a J-stomach + coils, not a circle with a tail", () => {
    const html = render("food");
    expect(html).toContain('data-gut="esophagus"');
    expect(html).toContain('data-gut="stomach"');
    expect(html).toContain('data-gut="fundus"');
    expect(html).toContain('data-gut="coil"');
    expect(html).toContain(MARK_GUT_ESOPHAGUS);
    expect(html).toContain(MARK_GUT_STOMACH);
    for (const coil of MARK_GUT_COILS) {
      expect(html).toContain(coil);
    }
    expect((html.match(/data-gut="coil"/g) ?? []).length).toBe(3);
  });
});
