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
    expect(mind).not.toContain('redirect("/mind/check")');
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
    expect(css).toMatch(/--tabbar-h:\s*72px/);
    expect(css).toContain("min-height: var(--tabbar-h)");
    expect(css).toMatch(
      /padding-bottom:\s*calc\(var\(--tabbar-h\) \+ var\(--safe-bottom\) \+ 28px\)/,
    );
    expect(css).toContain("padding: 6px 4px calc(6px + var(--safe-bottom))");
  });
});
