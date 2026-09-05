import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ChartEmptyFrame from "./ChartEmptyFrame";

describe("ChartEmptyFrame", () => {
  it("is a quiet charcoal plot — no invented data, no copy wall", () => {
    const html = renderToStaticMarkup(createElement(ChartEmptyFrame));
    expect(html).toContain("data-chart-empty");
    expect(html).toContain("chart-empty-frame");
    expect(html).toContain("aria-hidden");
    expect(html).toContain("vector-effect");
    expect(html).not.toContain("Ikke nok data");
    expect(html).not.toContain("circle");
    expect(html).not.toMatch(/<path /);
  });
});
