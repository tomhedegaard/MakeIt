import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ChartEmptyFrame from "./ChartEmptyFrame";

describe("ChartEmptyFrame", () => {
  it("is a quiet charcoal plot — axes + whisper band, no copy wall", () => {
    const html = renderToStaticMarkup(createElement(ChartEmptyFrame));
    expect(html).toContain('data-chart-empty="plot"');
    expect(html).toContain("chart-empty-frame");
    expect(html).toContain("aria-hidden");
    expect(html).toContain('data-chart-empty-axis="x"');
    expect(html).toContain('data-chart-empty-axis="y"');
    expect(html).toContain("data-chart-empty-band");
    expect(html).toContain("data-chart-empty-avg");
    expect(html).toContain("var(--domain, currentColor)");
    expect(html).toContain("vector-effect");
    expect(html).not.toContain("Ikke nok data");
    expect(html).not.toContain("circle");
  });
});
