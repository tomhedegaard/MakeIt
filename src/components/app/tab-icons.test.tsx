import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { Dumbbell } from "lucide-react";
import { describe, expect, it } from "vitest";

const tabbar = readFileSync(new URL("./MobileTabBar.tsx", import.meta.url), "utf8");

describe("Nord tab icons (spec §5)", () => {
  it("draws every tab from one line family, not the anatomical domain glyphs", () => {
    expect(tabbar).not.toMatch(/import DomainMark|<DomainMark/);
    expect(tabbar).toMatch(/import \{[^}]*\} from "lucide-react"/);
  });

  it("renders 1.5 px strokes with square ends (the props win over the library defaults)", () => {
    const html = renderToStaticMarkup(<Dumbbell strokeWidth={1.5} strokeLinecap="square" strokeLinejoin="miter" />);
    expect(html).toContain('stroke-width="1.5"');
    expect(html).toContain('stroke-linecap="square"');
    expect(html).toContain('stroke-linejoin="miter"');
    expect(html).not.toContain('stroke-linecap="round"');
  });
});
