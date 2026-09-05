import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../..");

describe("leftover first-run surfaces after #66", () => {
  it("does not show a LOADING flash on /mind or /nutrition", () => {
    expect(existsSync(join(here, "mind/loading.tsx"))).toBe(false);
    expect(existsSync(join(here, "nutrition/loading.tsx"))).toBe(false);
    const mind = readFileSync(join(here, "mind/page.tsx"), "utf8");
    expect(mind).toContain("MindCheckForm");
    expect(mind).toContain("MindDisclaimer");
    expect(mind).not.toContain('redirect("/mind/check")');
    expect(mind).not.toContain('redirect("/mind/onboarding")');
    const nutrition = readFileSync(join(here, "nutrition/page.tsx"), "utf8");
    expect(nutrition).toContain("isNutritionProfileFresh");
  });

  it("keeps May challenge and Open House behind demo on Crew", () => {
    const page = readFileSync(join(here, "community/page.tsx"), "utf8");
    expect(page).toContain("challengeEmptyTitle");
    expect(page).toContain("meetEmptyTitle");
    expect(page).toMatch(
      /Monthly challenge hero — demo only[\s\S]*!SUPABASE_ENABLED/,
    );
    expect(page).toMatch(/IRL meet — demo fixture only[\s\S]*!SUPABASE_ENABLED/);
  });

  it("uses Danish settings labels instead of leftover English", () => {
    const da = readFileSync(join(root, "messages/da/Settings.json"), "utf8");
    expect(da).toContain('"handleLabel": "Kaldenavn"');
    expect(da).toContain('"displayNameLabel": "Vist navn"');
    expect(da).not.toContain('"handleLabel": "Handle"');
    expect(da).not.toContain('"displayNameLabel": "Display navn"');
  });

  it("sizes the mobile tab-bar so wrapped labels do not cover content", () => {
    const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
    expect(css).toContain("--tabbar-row-h: 72px");
    expect(css).toContain("--tabbar-pad-y: 6px");
    expect(css).toContain("--tabbar-clearance: 36px");
    expect(css).toMatch(
      /--tabbar-h:\s*calc\(var\(--tabbar-pad-y\) \* 2 \+ var\(--tabbar-row-h\)\)/,
    );
    expect(css).toMatch(
      /--tabbar-stack:\s*calc\(var\(--tabbar-h\) \+ var\(--safe-bottom\)\)/,
    );
    expect(css).toContain("min-height: var(--tabbar-row-h)");
    expect(css).toMatch(
      /padding-bottom:\s*calc\(var\(--tabbar-stack\) \+ var\(--tabbar-clearance\)\)/,
    );
    expect(css).toContain("scroll-padding-bottom");
    expect(css).toContain(
      "padding: var(--tabbar-pad-y) 4px calc(var(--tabbar-pad-y) + var(--safe-bottom))",
    );
    expect(css).toContain("body:has(.tabbar) .cookie-bar");
    expect(css).toContain("bottom: var(--tabbar-stack)");
    const shell = readFileSync(join(root, "src/components/app/AppShell.tsx"), "utf8");
    expect(shell).toContain("pb-tabbar");
    expect(shell).toContain("overflow-y-auto");
    expect(shell).toContain("min-h-0");
    expect(shell).toContain("data-lenis-prevent");
    const bar = readFileSync(join(root, "src/components/app/MobileTabBar.tsx"), "utf8");
    expect(bar).toContain("--tabbar-stack");
    expect(bar).toContain("ResizeObserver");
  });
});
