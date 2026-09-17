import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

const SRC = fileURLToPath(new URL("../../", import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

// Member surfaces. Coach console, mail, classic landing and the 3D coach spike are out of scope (spec header).
const OUT_OF_SCOPE = [
  /^app\/coach\//, /^components\/coach\//, /^lib\/email\//, /^components\/marketing\/(?!kalk\/)/,
  /^components\/Spotlight\.tsx$/, /^components\/anatomy\/AnatomyFigure3D/,
];
// Browser-chrome metadata must be a literal (Next viewport API): Nat values are legitimate there.
// status-bar.ts (Task 5) paints the native bar and needs literal hex for the plugin.
const CHROME_METADATA = [
  "app/layout.tsx", "app/(app)/session/[id]/page.tsx", "app/coach/layout.tsx", "lib/native/status-bar.ts",
];

const DARK = /#0A0A0B|#F5F2EC|#111113|#18181B|#1F1F23|#A8A6A0|#56554F|#C97B3E|#4CAF7D|#E8703A|#4F86C6|rgba\(245,\s?242,\s?236|rgba\(10,\s?10,\s?11/i;
const DARK_UTIL = /\b(bg-black|text-white|bg-white|text-black)(\/\d+)?\b/;

const surfaceFiles = walk(SRC)
  .map((p) => relative(SRC, p))
  .filter((p) => /\.(tsx?|css)$/.test(p) && !/\.test\./.test(p) && p !== "app/globals.css")
  .filter((p) => !OUT_OF_SCOPE.some((r) => r.test(p)) && !CHROME_METADATA.includes(p));

describe("no dark-only literals on member surfaces (spec §8)", () => {
  it.each(surfaceFiles)("%s", (p) => {
    const src = readFileSync(join(SRC, p), "utf8");
    expect(src).not.toMatch(DARK);
    expect(src).not.toMatch(DARK_UTIL);
  });
});

describe("native and PWA chrome (spec §6, D3)", () => {
  const cap = readFileSync(new URL("../../../capacitor.config.ts", import.meta.url), "utf8");
  it("shell window background is Kalk; splash waits for the next store release", () => {
    expect(cap).toMatch(/^\s{2}backgroundColor: "#E7E9EB"/m);
    expect(cap).toMatch(/SplashScreen: \{\s*backgroundColor: "#0A0A0B"/);
  });
  it("PWA manifest is Kalk", () => {
    const m = read("app/manifest.ts");
    expect(m).toMatch(/background_color: "#E7E9EB"/);
    expect(m).toMatch(/theme_color: "#E7E9EB"/);
  });
});

describe("one title scale on every app page (spec §6)", () => {
  const APP = join(SRC, "app/(app)");
  // Pages that render no title of their own: live session (Nat, no chrome), redirects, delegates.
  const EXEMPT = new Set(["session/[id]/page.tsx", "mind/check/page.tsx", "mind/onboarding/page.tsx", "nutrition/setup/page.tsx"]);
  const pages = walk(APP).map((p) => relative(APP, p)).filter((p) => p.endsWith("page.tsx") && !EXEMPT.has(p));

  it.each(pages)("%s uses PageHeader or PageTitle", (p) => {
    const src = readFileSync(join(APP, p), "utf8");
    expect(src).toMatch(/<(PageHeader|PageTitle)\b/);
  });

  it.each([...pages, "nutrition/setup/NutritionSetupView.tsx"])("%s has no hand-built display h1", (p) => {
    const src = readFileSync(join(APP, p), "utf8");
    expect(src).not.toMatch(/<h1[^>]*font-display/);
  });
});

describe("theme scopes (spec §2)", () => {
  it("/coach is explicitly Nat with dark browser chrome", () => {
    const src = read("app/coach/layout.tsx");
    expect(src).toMatch(/<ThemeScope theme="nat"/);
    expect(src).toMatch(/colorScheme: "dark"/);
  });

  it("/onboarding is Kalk with light browser chrome", () => {
    const src = read("app/onboarding/layout.tsx");
    expect(src).toMatch(/<ThemeScope theme="kalk"/);
    expect(src).toMatch(/colorScheme: "light"/);
  });
});
