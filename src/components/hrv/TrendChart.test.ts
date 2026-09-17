import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-intl")>();
  const { default: messages } = await import("../../../messages/da");
  return {
    ...actual,
    useLocale: () => "da",
    useTranslations: (namespace?: string) =>
      actual.createTranslator({ locale: "da", messages, namespace: namespace as never }),
  };
});

import TrendChart from "./TrendChart";
import { demoEmptySeries, demoSteadySeries } from "@/lib/hrv/demo-series";

describe("TrendChart", () => {
  it("renders a quiet charcoal frame when the series is empty", () => {
    const html = renderToStaticMarkup(
      createElement(TrendChart, { readings: demoEmptySeries() }),
    );
    expect(html).toContain('data-trend-chart="empty"');
    expect(html).toContain("data-chart-empty");
    expect(html).not.toContain("Ikke nok data");
    expect(html).not.toContain("trendchart-title");
  });

  it("uses hairline grid and domain-ink data, not chubby markers", () => {
    const html = renderToStaticMarkup(
      createElement(TrendChart, { readings: demoSteadySeries() }),
    );
    expect(html).toContain('data-trend-chart="ready"');
    expect(html).toContain("vector-effect");
    expect(html).toContain("var(--domain, currentColor)");
    expect(html).toContain('r="1.45"');
    expect(html).not.toContain('r="2.5"');
    expect(html).not.toContain('r="3"');
    expect(html).toContain("stroke-dasharray");
    expect(html).toContain("<title id=\"trendchart-title\">HRV-trend</title>");
  });
});
