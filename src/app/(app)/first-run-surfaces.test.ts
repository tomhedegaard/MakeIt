import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../..");

describe("leftover first-run surfaces after #66", () => {
  it("opens /mind and /nutrition without a blank redirect hop", () => {
    // Honest opening state while the gate fetch runs — not an empty
    // content slot, and not a generic "Loader" pulse.
    expect(existsSync(join(here, "mind/loading.tsx"))).toBe(true);
    expect(existsSync(join(here, "nutrition/loading.tsx"))).toBe(true);
    const mindLoading = readFileSync(join(here, "mind/loading.tsx"), "utf8");
    const nutritionLoading = readFileSync(
      join(here, "nutrition/loading.tsx"),
      "utf8",
    );
    expect(mindLoading).toContain("RouteOpening");
    expect(mindLoading).toContain('kind="mind"');
    expect(nutritionLoading).toContain("RouteOpening");
    expect(nutritionLoading).toContain('kind="nutrition"');

    const mind = readFileSync(join(here, "mind/page.tsx"), "utf8");
    expect(mind).toContain("MindCheckForm");
    expect(mind).toContain("MindDisclaimer");
    expect(mind).not.toContain('redirect("/mind/check")');
    expect(mind).not.toContain('redirect("/mind/onboarding")');

    // Server redirect() after the setup gate commits an empty stub
    // on client tab clicks. Render the wizard on /nutrition instead.
    const nutrition = readFileSync(join(here, "nutrition/page.tsx"), "utf8");
    expect(nutrition).toContain("isNutritionProfileFresh");
    expect(nutrition).toContain("NutritionSetupView");
    expect(nutrition).not.toContain('redirect("/nutrition/setup")');

    const opening = readFileSync(
      join(root, "src/components/app/RouteOpening.tsx"),
      "utf8",
    );
    expect(opening).toContain('useTranslations("Misc.loading")');
    expect(opening).toContain("nutritionTitle");
    expect(opening).toContain("mindTitle");

    const da = JSON.parse(
      readFileSync(join(root, "messages/da/Misc.json"), "utf8"),
    ) as { loading: Record<string, string> };
    const en = JSON.parse(
      readFileSync(join(root, "messages/en/Misc.json"), "utf8"),
    ) as { loading: Record<string, string> };
    expect(Object.keys(da.loading)).toEqual(Object.keys(en.loading));
    expect(da.loading.nutritionTitle).toBe("Åbner kost…");
    expect(en.loading.nutritionTitle).toBe("Opening food…");
    expect(da.loading.mindTitle).toBe("Åbner Mind…");
    expect(en.loading.mindTitle).toBe("Opening Mind…");
    expect(da.loading.nutritionBody).not.toMatch(/sender/i);
    expect(en.loading.nutritionBody).not.toMatch(/send you/i);
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
    expect(css).toContain("padding-bottom: var(--tabbar-clearance)");
    expect(css).toContain("position: relative");
    expect(css).toContain("flex-shrink: 0");
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
