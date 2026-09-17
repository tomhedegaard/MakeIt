// src/components/ui/ThemeScope.test.ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ThemeScope from "./ThemeScope";

describe("ThemeScope", () => {
  it("marks its subtree with the theme and the theme-root hook", () => {
    const html = renderToStaticMarkup(
      createElement(ThemeScope, { theme: "kalk", children: "x" }),
    );
    expect(html).toBe('<div data-theme="kalk" class="theme-root">x</div>');
  });

  it("merges layout classes", () => {
    const html = renderToStaticMarkup(
      createElement(ThemeScope, { theme: "nat", className: "flex-1 flex flex-col", children: "x" }),
    );
    expect(html).toContain('data-theme="nat"');
    expect(html).toContain('class="theme-root flex-1 flex flex-col"');
  });
});
