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
 * #69 bumped --tabbar-h on main.pb-tabbar, but the window was still the
 * scrollport (`html, body { height: 100% }` + flex minh-dvh). Long AppShell
 * routes (HRV Today/Learn, Reps) painted last lines under the 8-tab bar;
 * short Trends looked clear. Clearance has to live on the scrollport.
 */
describe("AppShell tab-bar clearance", () => {
  it("makes main the mobile scrollport so pb-tabbar actually applies", () => {
    const shell = read("components/app/AppShell.tsx");
    expect(shell).toContain("h-dvh");
    expect(shell).toContain("lg:h-auto");
    expect(shell).toContain("overflow-hidden lg:overflow-visible");
    expect(shell).toMatch(
      /main[\s\S]*overflow-y-auto[\s\S]*pb-tabbar[\s\S]*lg:overflow-visible[\s\S]*lg:pb-0/,
    );
    expect(shell).toContain("min-h-0");
    expect(shell).toContain("data-lenis-prevent");
    expect(shell).toContain("shrink-0");
    expect(shell).not.toMatch(/header className="lg:hidden[^"]*sticky/);
  });

  it("binds --tabbar-stack to the rendered bar (wrap + safe-area)", () => {
    const bar = read("components/app/MobileTabBar.tsx");
    expect(bar).toContain('setProperty("--tabbar-stack"');
    expect(bar).toContain("ResizeObserver");
    expect(bar).toContain("getBoundingClientRect");
    const css = read("app/globals.css");
    expect(css).toContain("--tabbar-stack: calc(var(--tabbar-h) + var(--safe-bottom))");
    expect(css).toContain("padding-bottom: calc(var(--tabbar-stack) + var(--tabbar-clearance))");
    expect(css).toMatch(/\.tabbar \{[\s\S]*background: var\(--bg\)/);
    expect(css).not.toMatch(/\.tabbar \{[\s\S]*backdrop-filter/);
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
