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

// Member surfaces. Coach console, mail, non-landing marketing and the 3D coach spike are out of scope (spec header).
const OUT_OF_SCOPE = [
  /^app\/coach\//, /^components\/coach\//, /^lib\/email\//, /^components\/marketing\/(?!kalk\/)/,
  /^components\/anatomy\/AnatomyFigure3D/,
];
// Browser-chrome metadata must be a literal (Next viewport API): Nat values are legitimate there.
// status-bar.ts (Task 5) paints the native bar and needs literal hex for the plugin.
// These files are NOT exempted wholesale — they ARE scanned like any other member
// surface. Only the one literal-bearing declaration is stripped first, so anything
// else added to the file (a stray bg-black, a leftover dark hex) still fails.
const CHROME_METADATA: Record<string, (src: string) => string> = {
  // Next viewport export — themeColor is legitimately a dark literal here.
  // Non-greedy so it stops at the export's own closing "};", single- or multi-line.
  "app/layout.tsx": (src) => src.replace(/export const viewport[\s\S]*?};/, ""),
  "app/(app)/session/[id]/page.tsx": (src) => src.replace(/export const viewport[\s\S]*?};/, ""),
  "app/coach/layout.tsx": (src) => src.replace(/export const viewport[\s\S]*?};/, ""),
  // Only the native status-bar background-colour map — the rest of the file
  // (style logic, plugin wiring) stays subject to the gate.
  "lib/native/status-bar.ts": (src) => src.replace(/const BACKGROUND = \{[\s\S]*?\} as const;/, ""),
};

// Intentionally narrow: the exact dark-only token values — Nord nat's own
// surfaces, greys, lines and domain hues, plus every pre-Nord dark literal so
// the old palette cannot creep back. NOT a general hex scanner, and #111111 is
// deliberately absent: it is Nord lys's --fg as well as Nord nat's --bg.
// Widen only when a genuine new dark-only literal shows up.
const DARK = new RegExp([
  // Nord nat (spec §3.2)
  "#1A1A19", "#232322", "#E6E6E2", "#8F8F8A", "#3A3A38",
  "#F2545B", "#45C487", "#FF9C41", "#5B9DF5", "#9F8CFB", "#6FE0E8",
  String.raw`rgba\(255,\s?255,\s?255`,
  // Pre-Nord dark palette (Nat/Kalk era)
  "#0A0A0B", "#F5F2EC", "#111113", "#18181B", "#1F1F23", "#A8A6A0", "#56554F",
  "#C97B3E", "#4CAF7D", "#E8703A", "#4F86C6", "#1A1A1C", "#3A3A3E", "#222226",
  String.raw`rgba\(245,\s?242,\s?236`, String.raw`rgba\(10,\s?10,\s?11`,
].join("|"), "i");
// Intentionally narrow: only the specific dark-only Tailwind utilities that were
// actually used pre-Nord, not every colour utility. Tokens only: a white page
// is bg-bg, never bg-white.
const DARK_UTIL = /\b(bg-black|text-white|bg-white|text-black)(\/\d+)?\b/;

const surfaceFiles = walk(SRC)
  .map((p) => relative(SRC, p))
  .filter((p) => /\.(tsx?|css)$/.test(p) && !/\.test\./.test(p) && p !== "app/globals.css")
  .filter((p) => !OUT_OF_SCOPE.some((r) => r.test(p)));

describe("no dark-only literals on member surfaces (spec §8)", () => {
  it.each(surfaceFiles)("%s", (p) => {
    const raw = readFileSync(join(SRC, p), "utf8");
    const src = CHROME_METADATA[p] ? CHROME_METADATA[p](raw) : raw;
    expect(src).not.toMatch(DARK);
    expect(src).not.toMatch(DARK_UTIL);
  });
});

// Nord er sentence case i én skrift (spec §4, §7.1). Klasserne herunder
// hører til Kalks stemme — spærret mono i versaler — og må ikke vende
// tilbage. Tal skiller sig ud på tabular-nums, ikke på familie.
const KALK_VOICE = /(?:^|\s|")(uppercase|font-mono|tracking-(?:\[0\.\d+em\]|wide|wider|widest))(?=\s|"|$)/m;

// Én type-skala (spec §4): overskrifter bruger text-title/-section/-card og
// hero-tal text-hero. En håndrullet clamp() er præcis den drift, skalaen
// skulle standse. Landingen har sin egen skala og er undtaget.
describe("headings use the Nord type scale (spec §4)", () => {
  const files = surfaceFiles.filter((p) => p.endsWith(".tsx") && !p.startsWith("components/marketing/"));
  it.each(files)("%s", (p) => {
    expect(readFileSync(join(SRC, p), "utf8")).not.toMatch(/<h[1-3]\b[^>]*text-\[clamp\(/);
  });
});

describe("sentence case in one font (spec §4, §7.1)", () => {
  it.each(surfaceFiles)("%s", (p) => {
    expect(readFileSync(join(SRC, p), "utf8")).not.toMatch(KALK_VOICE);
  });

  it("catches the voice it is meant to catch (self-test)", () => {
    expect('className="text-xs font-mono uppercase tracking-[0.14em]"').toMatch(KALK_VOICE);
    expect('className="text-xs tracking-tight"').not.toMatch(KALK_VOICE);
    expect("const s = name.toUpperCase();").not.toMatch(KALK_VOICE);
  });
});

describe("chrome-metadata stripping is narrow (self-test)", () => {
  it("strips a single-line viewport export clean of its dark literal", () => {
    const strip = CHROME_METADATA["app/coach/layout.tsx"];
    const fixture = 'export const viewport: Viewport = { themeColor: "#1A1A19", colorScheme: "dark" };\n';
    expect(strip(fixture)).not.toMatch(DARK);
  });

  it("strips a multi-line viewport export clean of its dark literal", () => {
    const strip = CHROME_METADATA["app/layout.tsx"];
    const fixture = [
      "export const viewport: Viewport = {",
      '  themeColor: "#1A1A19",',
      '  colorScheme: "dark",',
      "};",
      "",
    ].join("\n");
    expect(strip(fixture)).not.toMatch(DARK);
  });

  it("does NOT strip a dark literal that lives outside the viewport export", () => {
    const strip = CHROME_METADATA["app/layout.tsx"];
    const fixture = [
      'export const viewport: Viewport = { themeColor: "#1A1A19", colorScheme: "dark" };',
      'const rogue = "bg-black";',
      "",
    ].join("\n");
    // The strip only removes the viewport statement; the matcher still catches
    // anything else — this is not a blanket file exemption.
    expect(strip(fixture)).toMatch(DARK_UTIL);
  });

  it("strips only the BACKGROUND map in status-bar.ts, not the rest of the file", () => {
    const strip = CHROME_METADATA["lib/native/status-bar.ts"];
    const fixture = [
      'const BACKGROUND = { LIGHT: "#FFFFFF", DARK: "#1A1A19" } as const;',
      'const rogue = "bg-black";',
      "",
    ].join("\n");
    const stripped = strip(fixture);
    expect(stripped).not.toMatch(DARK);
    expect(stripped).toMatch(DARK_UTIL);
  });
});

describe("native and PWA chrome (spec §6, D3)", () => {
  const cap = readFileSync(new URL("../../../capacitor.config.ts", import.meta.url), "utf8");
  it("shell window and splash are both Nord lys", () => {
    expect(cap).toMatch(/^\s{2}backgroundColor: "#FFFFFF"/m);
    expect(cap).toMatch(/SplashScreen: \{[\s\S]*?backgroundColor: "#FFFFFF"/);
  });
  it("PWA manifest is Nord lys", () => {
    const m = read("app/manifest.ts");
    expect(m).toMatch(/background_color: "#FFFFFF"/);
    expect(m).toMatch(/theme_color: "#FFFFFF"/);
  });
});

describe("one title scale on every app page (spec §6)", () => {
  const APP = join(SRC, "app/(app)");
  // Pages that render no title of their own: live session (Nat, no chrome), redirects, delegates.
  const EXEMPT = new Set(["session/[id]/page.tsx", "mind/check/page.tsx", "mind/onboarding/page.tsx", "nutrition/setup/page.tsx", "train/page.tsx"]);
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

describe("section headers use SectionHeader (spec §6)", () => {
  // The eyebrow's own closing tag, not some ancestor's: [^<] keeps the match
  // inside one element, so an eyebrow that sits in a flex row next to a step
  // counter is not read as a hand-built section header.
  const HAND_BUILT = /<(div|p|span)\s+className="eyebrow[^"]*"[^>]*>[^<]{0,160}<\/\1>\s*<h2\b/;
  // The F2 landing (components/marketing/kalk) has its own type scale and gates.
  const files = surfaceFiles.filter(
    (p) => p.endsWith(".tsx") && !p.startsWith("components/ui/") && !p.startsWith("components/marketing/"),
  );
  it.each(files)("%s", (p) => {
    expect(readFileSync(join(SRC, p), "utf8")).not.toMatch(HAND_BUILT);
  });
});

describe("no <header> wrapping PageTitle (spec §6, invalid nested header)", () => {
  const APP = join(SRC, "app/(app)");
  const files = walk(APP)
    .map((p) => relative(APP, p))
    .filter((p) => /\.tsx$/.test(p) && !/\.test\./.test(p));

  it.each(files)("%s", (p) => {
    const src = readFileSync(join(APP, p), "utf8");
    expect(src).not.toMatch(/<header\b[^>]*>\s*<PageTitle\b/);
  });
});

describe("theme scopes (spec §2)", () => {
  it("/coach is explicitly Nat with dark browser chrome", () => {
    const src = read("app/coach/layout.tsx");
    expect(src).toMatch(/<ThemeScope theme="nat"/);
    expect(src).toMatch(/colorScheme: "dark"/);
  });

  it("/onboarding is Nord lys with light browser chrome", () => {
    const src = read("app/onboarding/layout.tsx");
    expect(src).toMatch(/<ThemeScope theme="nord"/);
    expect(src).toMatch(/colorScheme: "light"/);
  });
});
