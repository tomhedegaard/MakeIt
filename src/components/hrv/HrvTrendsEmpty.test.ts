import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import HrvTrendsEmpty from "./HrvTrendsEmpty";

describe("HrvTrendsEmpty", () => {
  it("is an honest empty — title, body and CTA, not a blank plot", () => {
    const html = renderToStaticMarkup(
      createElement(HrvTrendsEmpty, {
        eyebrow: "Restitution",
        title: "Ingen målinger endnu",
        body: "Forbind dit wearable, så nattens HRV synker automatisk.",
        disclaimer: "HRV er et restitutions-signal — ikke en diagnose.",
        cta: createElement("button", { type: "button" }, "Forbind dit wearable"),
      }),
    );

    expect(html).toContain('data-hrv-trends="empty"');
    expect(html).toContain("Ingen målinger endnu");
    expect(html).toContain("Forbind dit wearable");
    expect(html).toContain("<h2");
    expect(html).not.toContain("data-chart-empty");
    expect(html).not.toContain("chart-empty-frame");
    expect(html).not.toContain("data-trend-chart");
    expect(html).not.toContain("Når nattens måling lander");
    expect(html).not.toContain("just an empty track");
  });
});
