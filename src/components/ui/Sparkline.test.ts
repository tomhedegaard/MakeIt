import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Sparkline from "./Sparkline";

describe("Sparkline", () => {
  it("renders a quiet frame instead of a text wall when sparse", () => {
    const html = renderToStaticMarkup(createElement(Sparkline, { data: [42] }));
    expect(html).toContain("data-chart-empty");
    expect(html).not.toContain("Ikke nok data endnu");
  });

  it("smooths a series with Catmull-Rom and an editorial last mark", () => {
    const html = renderToStaticMarkup(
      createElement(Sparkline, { data: [1, 3, 2, 4, 3] }),
    );
    expect(html).toContain("data-sparkline");
    expect(html).toContain("C ");
    expect(html).toContain('r="1.7"');
    expect(html).not.toContain("<polyline");
    expect(html).not.toContain('r="3"');
  });
});
