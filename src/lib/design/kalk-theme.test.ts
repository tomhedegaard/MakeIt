// src/lib/design/kalk-theme.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { readThemeTokens } from "./theme-tokens";

const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../../app/layout.tsx", import.meta.url), "utf8");
const kalk = readThemeTokens(css, '[data-theme="kalk"]');
const nat = readThemeTokens(css, '[data-theme="nat"]');

const SURFACES = ["--bg", "--bg-2"] as const;
// Neutral text also sits on nested fields (.input, surface-2 = --bg-3)
const NEUTRAL_TEXT = ["--fg", "--fg-dim", "--fg-faint"] as const;
const TEXT = [
  "--fg", "--fg-dim", "--fg-faint", "--signal-ink",
  "--body", "--food", "--heart", "--mind",
  "--ok", "--warn", "--danger",
] as const;
const DERIVED = [
  "--heart-tint", "--food-tint", "--body-tint", "--mind-tint",
  "--heart-line", "--food-line", "--body-line", "--mind-line",
] as const;

describe("Kalk theme gate (spec §3, §8)", () => {
  it.each(TEXT.flatMap((t) => SURFACES.map((s) => [t, s] as const)))(
    "%s reaches AA (4.5:1) on %s",
    (text, surface) => {
      expect(contrastRatio(kalk[text], kalk[surface])).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(NEUTRAL_TEXT)("%s reaches AA (4.5:1) on nested --bg-3", (text) => {
    expect(contrastRatio(kalk[text], kalk["--bg-3"])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(SURFACES)("--signal reaches 3:1 as a graphic on %s", (surface) => {
    expect(contrastRatio(kalk["--signal"], kalk[surface])).toBeGreaterThanOrEqual(3);
  });

  it("re-declares derived tints so they resolve against Kalk hues", () => {
    for (const t of DERIVED) expect(kalk[t]).toMatch(/color-mix/);
  });

  it("has one typographic voice: the stacks are the Kalk families everywhere", () => {
    expect(layout).not.toMatch(/Inter|Archivo_Black|JetBrains_Mono/);
    expect(layout).toMatch(/Big_Shoulders\(\{\s*variable: "--font-display-stack"/);
    expect(layout).toMatch(/Geist\(\{\s*variable: "--font-sans-stack"/);
    expect(layout).toMatch(/Geist_Mono\(\{\s*variable: "--font-mono-stack"/);
    expect(layout).not.toMatch(/preload: false/);
    // Big Shoulders has no next/font metrics to auto-generate a fallback from.
    expect(layout).toMatch(/Big_Shoulders\(\{[\s\S]*?adjustFontFallback: false/);
  });

  it("sets the Big Shoulders display treatment on :root, not per theme", () => {
    const root = readThemeTokens(css, ":root");
    expect(root["--display-weight"]).toBe("800");
    expect(root["--display-tracking"]).toBe("-0.005em");
    expect(root["--display-leading"]).toBe("0.88");
    expect(kalk["--display-weight"]).toBeUndefined();
    expect(kalk["--font-display-stack"]).toBeUndefined();
    expect(nat["--display-weight"]).toBeUndefined();
  });

  it("keeps Nat identical to today's dark base", () => {
    expect(nat["--bg"]).toBe("#0A0A0B");
    expect(nat["--fg"]).toBe("#F5F2EC");
  });

  it("mirrors every Kalk colour token in the Nat <html> lift", () => {
    const natLift = readThemeTokens(css, 'html:has(.theme-root[data-theme="nat"])');
    for (const k of Object.keys(kalk)) expect(natLift, k).toHaveProperty(k);
  });

  it("keeps the Nat <html> lift value-identical to Nat", () => {
    const natLift = readThemeTokens(css, 'html:has(.theme-root[data-theme="nat"])');
    const shared = Object.keys(natLift).filter((k) => k in nat);
    for (const k of shared) {
      expect(natLift[k].replace(/\s+/g, " "), k).toBe(nat[k].replace(/\s+/g, " "));
    }
  });

  it("lifts the theme to <html> so body background and overscroll follow", () => {
    expect(css).toContain('html:has(.theme-root[data-theme="kalk"])');
    expect(css).toContain('html:has(.theme-root[data-theme="nat"])');
    // Nat comes after Kalk so a Nat page inside a Kalk layout wins at <html>
    expect(css.indexOf('html:has(.theme-root[data-theme="nat"])'))
      .toBeGreaterThan(css.indexOf('html:has(.theme-root[data-theme="kalk"])'));
  });

  it("gives inputs 16px on touch so iOS does not zoom (enables removing maximumScale)", () => {
    // The query also lists a max-width fallback for phone viewports that
    // do not report a coarse pointer (desktop responsive mode, webviews).
    expect(css).toMatch(/@media \(pointer: coarse\)[^{]*\{[\s\S]*?\.input,\s*\.field\s*\{[\s\S]*?font-size:\s*16px/);
    expect(css).toMatch(/@media \(pointer: coarse\), \(max-width: 40rem\)/);
  });

  const NEW_TOKENS = ["--scrim", "--media", "--anatomy-body", "--anatomy-edge", "--anatomy-idle", "--anatomy-accent"];

  it.each(NEW_TOKENS)("%s exists in Kalk, Nat and the Nat lift", (t) => {
    const natLift = readThemeTokens(css, 'html:has(.theme-root[data-theme="nat"])');
    expect(kalk[t], "kalk").toBeDefined();
    expect(nat[t], "nat").toBeDefined();
    expect(natLift[t], "lift").toBeDefined();
  });

  it("exposes scrim and media as Tailwind colours", () => {
    expect(css).toMatch(/--color-scrim:\s*var\(--scrim\)/);
    expect(css).toMatch(/--color-media:\s*var\(--media\)/);
  });

  it("gives the anatomy accent 3:1 as a graphic on Kalk --bg-2", () => {
    expect(contrastRatio(kalk["--anatomy-accent"], kalk["--bg-2"])).toBeGreaterThanOrEqual(3);
  });

  it.each(["--mind-energy", "--mind-stress", "--mind-focus"])(
    "%s reaches 3:1 as chart ink on Kalk --bg and --bg-2",
    (t) => {
      for (const s of SURFACES) expect(contrastRatio(kalk[t], kalk[s])).toBeGreaterThanOrEqual(3);
    },
  );

  it("nattens kurve har et statisk slutbillede ved reduceret bevægelse", () => {
    // Anchored to ONE block: [^}]* does not cross a closing brace, so
    // the rule has to sit inside the reduced-motion block for this to pass.
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[^@]*?\.night-curve__path\s*\{[^}]*stroke-dashoffset:\s*0/,
    );
  });
});
