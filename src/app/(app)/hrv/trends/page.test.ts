import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("HRV trends empty state", () => {
  it("renders an honest empty + wearable CTA, not a blank plot frame", () => {
    expect(page).toContain("HrvTrendsEmpty");
    expect(page).toContain('t("empty.title")');
    expect(page).toContain('t("empty.body")');
    expect(page).toContain("ConnectButton");
    expect(page).toContain('tPage("connectCta")');
    expect(page).not.toMatch(/state === "empty"[\s\S]*ChartEmptyFrame/);
    expect(page).not.toContain("copy.emptyBody");
  });

  it("still mounts TrendChart once readings exist", () => {
    expect(page).toContain("<TrendChart readings={series} />");
    expect(page).toContain("StateProvisional");
    expect(page).toContain("StateActive");
  });
});
