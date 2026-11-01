import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("coaching connected first-run", () => {
  it("does not use mock STR-12 / mock week as the connected fallback", () => {
    expect(page).toContain("todayCardForSurface");
    expect(page).toContain("weekStripForSurface");
    expect(page).toContain("libraryForSurface");
    expect(page).toContain("emptyWeekStrip");
    expect(page).not.toMatch(/todayCardDb\s*\?\?\s*todayCardFromMock/);
    expect(page).not.toMatch(/weekDb\s*\?\?\s*mockWeekStrip/);
    expect(page).not.toMatch(/libraryDb\s*\?\?\s*mockLibrary/);
  });

  it("leaves the session card and WHY strip to I dag", () => {
    expect(page).not.toContain("AdaptiveReasonStrip");
    expect(page).toMatch(/\{today \? \(\s*<section\s+aria-label=\{t\("next\.ariaLabel"\)\}/);
  });

  it("only stands the mock program in for the active one in demo", () => {
    expect(page).toContain("connected ? activeDb : demoActive(library)");
  });

  it("disables Start Program when the catalog row has no days", () => {
    expect(page).toContain("hasDays={p.dayCount > 0}");
  });
});
