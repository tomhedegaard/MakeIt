import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const loopSrc = readFileSync(
  new URL("../components/marketing/LandingLoop.tsx", import.meta.url),
  "utf8",
);
const showcase = readFileSync(
  new URL("../components/marketing/AppShowcase.tsx", import.meta.url),
  "utf8",
);
const bodyMap = readFileSync(
  new URL("../components/marketing/MarketingBodyMap.tsx", import.meta.url),
  "utf8",
);

describe("landing loop composition", () => {
  it("scrolls Program → Form-check → Helhed → phones as gallery", () => {
    const loopAt = page.indexOf("<LandingLoop");
    const appAt = page.indexOf("<AppShowcase");
    expect(loopAt).toBeGreaterThan(-1);
    expect(appAt).toBeGreaterThan(loopAt);

    expect(showcase.indexOf("<MarketingBodyMap")).toBeGreaterThan(-1);
    expect(showcase.indexOf("<MarketingBodyMap")).toBeLessThan(
      showcase.indexOf("data-landing-gallery"),
    );
    expect(showcase).toContain('id="app"');

    expect(bodyMap).toContain('data-landing-beat="helhed"');
    expect(bodyMap).toContain("Marketing.loop.helhed");

    expect(loopSrc.indexOf('beat="program"')).toBeLessThan(
      loopSrc.indexOf('beat="form-check"'),
    );
    expect(loopSrc).not.toMatch(/import\s+MarketingBodyMap/);
  });
});
