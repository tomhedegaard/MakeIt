// src/lib/design/nord-theme.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { readThemeTokens } from "./theme-tokens";

const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../../app/layout.tsx", import.meta.url), "utf8");
const nord = readThemeTokens(css, '[data-theme="nord"]');
const nat = readThemeTokens(css, '[data-theme="nat"]');
const THEMES = [
  ["nord", nord],
  ["nat", nat],
] as const;

const SURFACES = ["--bg", "--bg-2"] as const;
// Neutral text also sits on nested fields (.input, surface-2 = --bg-3)
const NEUTRAL_TEXT = ["--fg", "--fg-body", "--fg-dim", "--fg-faint"] as const;
const TEXT = [
  ...NEUTRAL_TEXT, "--signal-ink",
  "--body", "--food", "--heart", "--mind",
  "--ok", "--warn", "--danger",
] as const;
const DERIVED = [
  "--heart-tint", "--food-tint", "--body-tint", "--mind-tint",
  "--heart-line", "--food-line", "--body-line", "--mind-line",
] as const;

describe.each(THEMES)("Nord %s token gate (spec 2026-09-26 §3)", (_name, theme) => {
  it.each(TEXT.flatMap((t) => SURFACES.map((s) => [t, s] as const)))(
    "%s reaches AA (4.5:1) on %s",
    (text, surface) => {
      expect(contrastRatio(theme[text], theme[surface])).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(NEUTRAL_TEXT)("%s reaches AA (4.5:1) on nested --bg-3", (text) => {
    expect(contrastRatio(theme[text], theme["--bg-3"])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(SURFACES)("--signal reaches 3:1 as a graphic on %s", (surface) => {
    expect(contrastRatio(theme["--signal"], theme[surface])).toBeGreaterThanOrEqual(3);
  });

  it("re-declares derived tints so they resolve against this theme's hues", () => {
    for (const t of DERIVED) expect(theme[t]).toMatch(/color-mix/);
  });

  it("gives the anatomy accent 3:1 as a graphic on --bg-2", () => {
    expect(contrastRatio(theme["--anatomy-accent"], theme["--bg-2"])).toBeGreaterThanOrEqual(3);
  });

  it.each(["--mind-energy", "--mind-stress", "--mind-focus"])(
    "%s reaches 3:1 as chart ink on --bg and --bg-2",
    (t) => {
      for (const s of SURFACES) expect(contrastRatio(theme[t], theme[s])).toBeGreaterThanOrEqual(3);
    },
  );

  it.each(["--scrim", "--media", "--anatomy-body", "--anatomy-edge", "--anatomy-idle", "--anatomy-accent"])(
    "%s exists",
    (t) => expect(theme[t]).toBeDefined(),
  );
});

describe("Nord structure (spec §3, §7)", () => {
  it("puts Nord lys on :root, so light is the default and dark is the exception", () => {
    const root = readThemeTokens(css, ":root");
    expect(root["--bg"]).toBe("#FFFFFF");
    expect(root["--signal"]).toBe("#2E4A3B");
    expect(css).toMatch(/:root,\n\[data-theme="nord"\] \{/);
  });

  it("declares Nord nat and its <html> lift in ONE block, so they cannot drift", () => {
    expect(css).toMatch(/\[data-theme="nat"\],\nhtml:has\(\.theme-root\[data-theme="nat"\]\) \{/);
    // …and after Nord lys, so a Nat page inside a light layout wins at <html>
    expect(css.indexOf('[data-theme="nat"],')).toBeGreaterThan(css.indexOf('[data-theme="nord"] {'));
  });

  it("is mørkt in exactly the two places the spec allows", () => {
    const scopes = [...css.matchAll(/data-theme="nat"/g)];
    expect(scopes.length).toBeGreaterThan(0);
    expect(css).not.toContain('data-theme="kalk"');
  });

  it("has one typographic voice: Schibsted Grotesk in 400 and 500", () => {
    expect(layout).toMatch(/Schibsted_Grotesk\(\{\s*variable: "--font-sans-stack"/);
    expect(layout).toMatch(/weight: \["400", "500"\]/);
    expect(layout).not.toMatch(/Big_Shoulders|Geist|Inter|Archivo_Black|JetBrains_Mono/);
    expect(layout).not.toMatch(/preload: false/);
  });

  it("points display and mono at the same family, so no surface can ask for a second font", () => {
    expect(css).toMatch(/--font-sans:\s*var\(--font-sans-stack\)/);
    expect(css).toMatch(/--font-display:\s*var\(--font-sans-stack\)/);
    expect(css).toMatch(/--font-mono:\s*var\(--font-sans-stack\)/);
    expect(css).not.toMatch(/--font-display-stack|--font-mono-stack/);
  });

  it("sets the display treatment on :root: 500, sentence case", () => {
    const root = readThemeTokens(css, ":root");
    expect(root["--display-weight"]).toBe("500");
    expect(root["--display-tracking"]).toBe("-0.03em");
    expect(root["--display-leading"]).toBe("1");
    expect(nord["--display-weight"]).toBeUndefined();
    expect(nat["--display-weight"]).toBeUndefined();
  });

  it("has no uppercase left in the stylesheet (spec §7.1)", () => {
    expect(css).not.toMatch(/text-transform:\s*uppercase/);
  });

  it("is radius 0: every rounded corner is a token at 0, a circle or a dot", () => {
    for (const m of css.matchAll(/--radius-[a-z0-9]+:\s*([^;]+);/g)) expect(m[1].trim()).toBe("0");
    const radii = [...css.matchAll(/[^-]border-radius:\s*([^;]+);/g)].map((m) => m[1].trim());
    expect(radii.length).toBeGreaterThan(0);
    for (const r of radii) expect(["0", "999px", "50%"]).toContain(r);
  });

  it("has no grain, no vignette and no glow (spec §7.2)", () => {
    expect(css).not.toMatch(/\.grain|\.vignette|--glow|--grain-|--vignette-/);
    expect(layout).not.toMatch(/grain|vignette/);
  });

  it("exposes fg-body, scrim and media as Tailwind colours", () => {
    expect(css).toMatch(/--color-fg-body:\s*var\(--fg-body\)/);
    expect(css).toMatch(/--color-scrim:\s*var\(--scrim\)/);
    expect(css).toMatch(/--color-media:\s*var\(--media\)/);
  });

  it("gives inputs 16px on touch so iOS does not zoom (enables removing maximumScale)", () => {
    expect(css).toMatch(/@media \(pointer: coarse\)[^{]*\{[\s\S]*?\.input,\s*\.field,[\s\S]*?textarea,\s*select\s*\{\s*font-size:\s*16px/);
    expect(css).toMatch(/@media \(pointer: coarse\), \(max-width: 40rem\)/);
  });

  it("nattens kurve har et statisk slutbillede ved reduceret bevægelse", () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[^@]*?\.night-curve__path\s*\{[^}]*stroke-dashoffset:\s*0/,
    );
  });
});
