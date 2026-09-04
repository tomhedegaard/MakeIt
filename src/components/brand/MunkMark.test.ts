import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MunkMark from "./MunkMark";

describe("MunkMark", () => {
  it("renders typographic initials + name, never a face", () => {
    const html = renderToStaticMarkup(createElement(MunkMark));
    expect(html).toContain("data-munk-mark");
    expect(html).toContain("Munk");
    expect(html).toContain(">M<");
    expect(html.toLowerCase()).not.toContain("sparkle");
    expect(html.toLowerCase()).not.toContain("smiley");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<svg");
  });
});
