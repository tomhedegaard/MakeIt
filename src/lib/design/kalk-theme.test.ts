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

  it("swaps the three font stacks to the Kalk families", () => {
    expect(kalk["--font-display-stack"]).toBe("var(--font-kalk-display)");
    expect(kalk["--font-sans-stack"]).toBe("var(--font-kalk-sans)");
    expect(kalk["--font-mono-stack"]).toBe("var(--font-kalk-mono)");
    expect(kalk["--display-weight"]).toBe("800");
  });

  it("keeps Nat identical to today's dark base", () => {
    expect(nat["--bg"]).toBe("#0A0A0B");
    expect(nat["--fg"]).toBe("#F5F2EC");
  });

  it("lets display treatment follow the font, not the Nat colours", () => {
    expect(readThemeTokens(css, ":root")["--display-weight"]).toBe("400");
    // A Nat surface inside Kalk inherits Big Shoulders, so Nat must not reset the weight
    expect(nat["--display-weight"]).toBeUndefined();
  });

  it("mirrors every Kalk colour token in the Nat <html> lift", () => {
    const natLift = readThemeTokens(css, 'html:has(.theme-root[data-theme="nat"])');
    const kalkColours = Object.keys(kalk).filter(
      (k) => !k.startsWith("--font-") && !k.startsWith("--display-"),
    );
    for (const k of kalkColours) expect(natLift, k).toHaveProperty(k);
  });

  it("Nat-lift skal have samme værdier som Nat", () => {
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

  it("loads the Kalk families under the variables the theme points at", () => {
    expect(layout).toMatch(/Big_Shoulders\(\{[\s\S]*?variable: "--font-kalk-display"/);
    expect(layout).toMatch(/Geist\(\{[\s\S]*?variable: "--font-kalk-sans"/);
    expect(layout).toMatch(/Geist_Mono\(\{[\s\S]*?variable: "--font-kalk-mono"/);
    expect(layout).toContain("kalkDisplay.variable");
  });
});
