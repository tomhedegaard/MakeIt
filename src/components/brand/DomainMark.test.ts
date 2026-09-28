/**
 * DomainMark is the one mark per health domain (Nord, spec §11). These
 * tests lock the contract: 24 px line icon, currentColor, 1.5 px square
 * strokes, data-domain, and the same icon the tab bar uses.
 */
import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import DomainMark, { DOMAINS, DOMAIN_ICON } from "./DomainMark";

const render = (domain: (typeof DOMAINS)[number]) => renderToStaticMarkup(createElement(DomainMark, { domain }));

describe("DomainMark", () => {
  it.each(DOMAINS)("renders the %s mark as a Nord line icon", (domain) => {
    const html = render(domain);
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html).toContain(`data-domain="${domain}"`);
    expect(html).toContain(`domain-mark--${domain}`);
    expect(html).toContain('stroke="currentColor"');
    expect(html).toContain('stroke-width="1.5"');
    expect(html).toContain('stroke-linecap="square"');
    expect(html).toContain('aria-hidden="true"');
  });

  it("gives every domain its own icon", () => {
    expect(new Set(Object.values(DOMAIN_ICON)).size).toBe(DOMAINS.length);
  });

  it("is the same mark the tab bar shows for the domain tabs", () => {
    const tabbar = readFileSync(new URL("../app/MobileTabBar.tsx", import.meta.url), "utf8");
    for (const d of ["body", "food", "mind"]) expect(tabbar).toContain(`<DomainMark domain="${d}"`);
  });
});
