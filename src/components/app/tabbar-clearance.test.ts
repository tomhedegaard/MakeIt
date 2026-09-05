import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

/**
 * #69 bumped --tabbar-h on main.pb-tabbar, but the bar stayed
 * `position: fixed` over a window scrollport. Long AppShell routes
 * (HRV Today/Learn, Reps) painted last lines *behind* the 8-tab bar;
 * short Trends looked clear. The bar must sit in-flow under main.
 */
describe("AppShell tab-bar clearance", () => {
  it("makes main the mobile scrollport and keeps the tab bar in-flow", () => {
    const shell = read("components/app/AppShell.tsx");
    expect(shell).toContain("h-dvh");
    expect(shell).toContain("lg:h-auto");
    expect(shell).toMatch(
      /main[\s\S]*overflow-y-auto[\s\S]*pb-tabbar[\s\S]*lg:overflow-visible[\s\S]*lg:pb-0/,
    );
    expect(shell).toContain("min-h-0");
    expect(shell).toContain("data-lenis-prevent");
    expect(shell).toContain("shrink-0");
    expect(shell).not.toMatch(/header className="lg:hidden[^"]*sticky/);
    // Tab bar is a sibling *after* main, inside the column — not a
    // fixed overlay sibling of the whole shell.
    expect(shell).toMatch(/<\/main>[\s\S]*<MobileTabBar/);
    expect(shell.indexOf("<MobileTabBar")).toBeGreaterThan(shell.indexOf("</main>"));
  });

  it("binds --tabbar-stack to the rendered bar (wrap + safe-area)", () => {
    const bar = read("components/app/MobileTabBar.tsx");
    expect(bar).toContain('setProperty("--tabbar-stack"');
    expect(bar).toContain("ResizeObserver");
    expect(bar).toContain("getBoundingClientRect");
    const css = read("app/globals.css");
    expect(css).toContain("--tabbar-stack: calc(var(--tabbar-h) + var(--safe-bottom))");
    expect(css).toContain("padding-bottom: var(--tabbar-clearance)");
    expect(css).toMatch(/nav\.tabbar \{[\s\S]*position: relative/);
    expect(css).toMatch(/nav\.tabbar \{[\s\S]*flex-shrink: 0/);
    expect(css).toMatch(/nav\.tabbar \{[\s\S]*background: var\(--bg\)/);
    expect(css).not.toMatch(/nav\.tabbar \{[\s\S]*position: fixed/);
    expect(css).not.toMatch(/nav\.tabbar \{[\s\S]*backdrop-filter/);
  });

  it("keeps HRV / Reps routes inheriting the shell scrollport", () => {
    const routes = [
      "app/(app)/hrv/layout.tsx",
      "app/(app)/hrv/page.tsx",
      "app/(app)/hrv/learn/page.tsx",
      "app/(app)/hrv/learn/adaptive/page.tsx",
      "app/(app)/hrv/trends/page.tsx",
      "app/(app)/reps/page.tsx",
    ];
    for (const rel of routes) {
      const src = read(rel);
      expect(src, rel).not.toMatch(/overflow-y-auto|overflow-y-scroll|h-dvh|h-screen/);
    }
    expect(read("app/(app)/hrv/layout.tsx")).toContain('className="contents"');
  });
});
