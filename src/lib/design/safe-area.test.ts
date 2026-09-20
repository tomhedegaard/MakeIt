import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const css = read("app/globals.css");

// The shells render the live site full-screen, so anything pinned to the
// top of the viewport lands under the status bar and the Dynamic Island
// unless it reserves the inset (seen in the simulator, 2026-09-20).
const TOP_CHROME = [
  "components/app/AppShell.tsx",
  "components/marketing/kalk/KalkNav.tsx",
  "components/coach/CoachShell.tsx",
  "app/(app)/session/[id]/SessionClient.tsx",
  "app/(app)/session/[id]/SessionPreview.tsx",
  "app/onboarding/OnboardingClient.tsx",
];

describe("top chrome clears the status bar in the native shells", () => {
  it("the helper exists and uses the safe-area token", () => {
    expect(css).toMatch(/--safe-top:\s*env\(safe-area-inset-top, 0px\)/);
    expect(css).toMatch(/\.safe-top \{ padding-top: var\(--safe-top\); \}/);
  });

  it.each(TOP_CHROME)("%s reserves the inset on its header", (file) => {
    const src = read(file);
    const headers = src.match(/<header className="[^"]*"/g) ?? [];
    const pinned = headers.filter((h) => /sticky top-0|h-14/.test(h));
    expect(pinned.length, `${file} has no pinned header any more`).toBeGreaterThan(0);
    for (const h of pinned) expect(h, file).toMatch(/\bsafe-top\b/);
  });
});
