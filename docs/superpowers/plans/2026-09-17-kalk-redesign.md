# Kalk-redesign · implementeringsplan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Indfør Kalk (koncept B med udvalgte elementer fra A og C) som et tema-scope og rul det ud flade for flade: fundament → landing → app-kerne → app-flader → ægte assets.

**Architecture:** Tokens beholder navnene. `[data-theme="kalk"]` og `[data-theme="nat"]` giver dem værdier, og `html:has(.theme-root[data-theme=…])` løfter temaet til `<html>`/`<body>`. Fonte skiftes via de eksisterende `--font-*-stack`-variabler. En lille `ThemeScope`-komponent er den eneste måde at slå et tema til på.

**Tech Stack:** Next.js 16.2 (App Router, `next/font/google`), Tailwind v4 (`@theme inline`), vitest (node-miljø, `renderToStaticMarkup`), next-intl.

**Spec:** [`docs/superpowers/specs/2026-09-17-kalk-redesign-design.md`](../specs/2026-09-17-kalk-redesign-design.md)
**Branch:** `claude/kalk-redesign`
**Commits:** små og atomare, conventional med dansk tekst (`feat(design): …`, `test(design): …`).

---

## Faseoversigt

| Fase | Leverance | Afhænger af | Estimat | Plan |
|---|---|---|---|---|
| **F1 Fundament** | Kalk- og Nat-scopes, fonte, `ThemeScope`, kontrastport, `/login` som pilot | Fase 0 (`7209696`) | 1-2 dage | **Detaljeret nedenfor** |
| **F2 Landing** | 8 sektioner (spec §5) med A1, A3, A4, C2, C3, C4, C6 | F1, D4, D5 | 6-8 dage | Egen plan: `…-kalk-f2-landing.md` |
| **F3 App-kerne** | 6 primitiver, dashboard "i dag først" (A2, C1, C5), 5 faner, `(app)` i Kalk, `/session` i Nat | F1 | 5-6 dage | [`2026-09-17-kalk-f3-app-core.md`](2026-09-17-kalk-f3-app-core.md) |
| **F4 App-flader** | Træn, Mad, Hjerte, Sind, Crew, profil og onboarding migreret. Farver uden for tokens fjernet. Statusbar i shells. Gamle fonte fjernet. | F3 | 6-8 dage | Egen plan: `…-kalk-f4-surfaces.md` |
| **F5 Assets** | Munk-portræt, ægte skærmbilleder (landing + App Store), citater | D6, D7 (Tom) | Løbende | Brief i `docs/briefs/` |

Hver fase kan shippes for sig. F2 og F3 kan køre parallelt efter F1.

---

## Chunk 1: F1 Fundament

### Filstruktur

| Fil | Ansvar |
|---|---|
| Create `src/lib/design/contrast.ts` | Ren WCAG-kontrastberegning |
| Create `src/lib/design/contrast.test.ts` | Tests for ovenstående |
| Create `src/lib/design/theme-tokens.ts` | Læser custom properties for en selector ud af en CSS-streng |
| Create `src/lib/design/theme-tokens.test.ts` | Tests for parseren |
| Create `src/lib/design/kalk-theme.test.ts` | Kvalitetsport: Kalk-tokens findes og klarer kontrast |
| Modify `src/app/globals.css` | Nat- og Kalk-blokke, tema-variabler for grain, vignette, display og glow |
| Modify `src/app/layout.tsx` | Loader Big Shoulders, Geist og Geist Mono som `--font-kalk-*` |
| Create `src/components/ui/ThemeScope.tsx` | `<div data-theme class="theme-root">` |
| Create `src/components/ui/ThemeScope.test.ts` | Render-test |
| Modify `src/app/login/page.tsx` | Pilot: Kalk-scope, viewport, glow via token |

---

### Task 1: Kontrastberegning

**Files:**
- Create: `src/lib/design/contrast.ts`
- Test: `src/lib/design/contrast.test.ts`

- [ ] **Step 1: Skriv den fejlende test**

```ts
// src/lib/design/contrast.test.ts
import { describe, expect, it } from "vitest";
import { contrastRatio, parseHex, relativeLuminance } from "./contrast";

describe("contrast", () => {
  it("parses 6-digit hex with or without #", () => {
    expect(parseHex("#FF0000")).toEqual([255, 0, 0]);
    expect(parseHex("00ff00")).toEqual([0, 255, 0]);
  });

  it("rejects anything that is not 6-digit hex", () => {
    expect(() => parseHex("#FFF")).toThrow();
    expect(() => parseHex("rgba(0,0,0,.1)")).toThrow();
  });

  it("gives black and white their WCAG luminance", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("matches WCAG reference ratios", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    // Kalk fg-dim on bg, computed in the spec: 6.77
    expect(contrastRatio("#4A4F57", "#E7E9EB")).toBeCloseTo(6.77, 1);
  });
});
```

- [ ] **Step 2: Kør testen og se den fejle**

Run: `npx vitest run src/lib/design/contrast.test.ts`
Expected: FAIL, fordi `./contrast` ikke kan resolves.

- [ ] **Step 3: Minimal implementering**

```ts
// src/lib/design/contrast.ts
/** WCAG 2.x contrast helpers. Pure, no DOM. */

const HEX6 = /^#?([0-9a-f]{6})$/i;

export function parseHex(hex: string): [number, number, number] {
  const m = hex.trim().match(HEX6);
  if (!m) throw new Error(`Not a 6-digit hex colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
```

- [ ] **Step 4: Kør testen og se den passere**

Run: `npx vitest run src/lib/design/contrast.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/design/contrast.ts src/lib/design/contrast.test.ts
git commit -m "test(design): WCAG-kontrastberegning til tema-porte"
```

---

### Task 2: Token-læser til CSS

**Files:**
- Create: `src/lib/design/theme-tokens.ts`
- Test: `src/lib/design/theme-tokens.test.ts`

- [ ] **Step 1: Skriv den fejlende test**

```ts
// src/lib/design/theme-tokens.test.ts
import { describe, expect, it } from "vitest";
import { readThemeTokens } from "./theme-tokens";

const css = `
:root,
[data-theme="nat"] {
  --bg: #0A0A0B;
  --fg: #F5F2EC; /* comment */
}
html:has(.theme-root[data-theme="kalk"]),
[data-theme="kalk"] {
  --bg: #E7E9EB;
  --heart-tint: color-mix(in oklab, var(--heart) 12%, transparent);
}
@media (prefers-reduced-motion: reduce) {
  [data-theme="kalk"] { --grain-anim: none; }
}
.btn { color: var(--fg); }
`;

describe("readThemeTokens", () => {
  it("reads custom properties from a selector inside a selector list", () => {
    expect(readThemeTokens(css, '[data-theme="nat"]')).toEqual({
      "--bg": "#0A0A0B",
      "--fg": "#F5F2EC",
    });
  });

  it("merges every block that lists the selector, later wins", () => {
    const kalk = readThemeTokens(css, '[data-theme="kalk"]');
    expect(kalk["--bg"]).toBe("#E7E9EB");
    expect(kalk["--heart-tint"]).toBe("color-mix(in oklab, var(--heart) 12%, transparent)");
    expect(kalk["--grain-anim"]).toBe("none");
  });

  it("returns an empty object for an unknown selector", () => {
    expect(readThemeTokens(css, '[data-theme="nope"]')).toEqual({});
  });

  it("ignores ordinary declarations", () => {
    expect(readThemeTokens(css, ".btn")).toEqual({});
  });
});
```

- [ ] **Step 2: Kør testen og se den fejle**

Run: `npx vitest run src/lib/design/theme-tokens.test.ts`
Expected: FAIL, fordi modulet mangler.

- [ ] **Step 3: Minimal implementering**

```ts
// src/lib/design/theme-tokens.ts
/**
 * Reads `--custom-property` declarations for one selector out of a CSS
 * string. Matches innermost `selector { … }` pairs, so rules inside
 * @media are read as well. Used by design-gate tests, not at runtime.
 */
const RULE = /([^{}]+)\{([^{}]*)\}/g;

export function readThemeTokens(css: string, selector: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [, selectorText, body] of clean.matchAll(RULE)) {
    const selectors = selectorText.split(",").map((s) => s.trim());
    if (!selectors.includes(selector)) continue;
    for (const decl of body.split(";")) {
      const i = decl.indexOf(":");
      if (i < 0) continue;
      const name = decl.slice(0, i).trim();
      if (!name.startsWith("--")) continue;
      tokens[name] = decl.slice(i + 1).trim();
    }
  }
  return tokens;
}
```

- [ ] **Step 4: Kør testen og se den passere**

Run: `npx vitest run src/lib/design/theme-tokens.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/design/theme-tokens.ts src/lib/design/theme-tokens.test.ts
git commit -m "test(design): læser for tema-tokens i globals.css"
```

---

### Task 3: Kalk- og Nat-tokens i `globals.css`

**Files:**
- Test: `src/lib/design/kalk-theme.test.ts`
- Modify: `src/app/globals.css`. Første `:root`-blok går fra l. 6 til 58, og `--danger` står på l. 57. `.font-display` står på l. 158, `.grain::before` på l. ~204 og `.vignette::after` på l. ~241. **Obs:** der er en anden `:root`-blok (safe-area) på l. 410. Den skal ikke røres.

- [ ] **Step 1: Skriv kvalitetsporten (fejler)**

```ts
// src/lib/design/kalk-theme.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { readThemeTokens } from "./theme-tokens";

const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
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

  it("lifts the theme to <html> so body background and overscroll follow", () => {
    expect(css).toContain('html:has(.theme-root[data-theme="kalk"])');
    expect(css).toContain('html:has(.theme-root[data-theme="nat"])');
    // Nat comes after Kalk so a Nat page inside a Kalk layout wins at <html>
    expect(css.indexOf('html:has(.theme-root[data-theme="nat"])'))
      .toBeGreaterThan(css.indexOf('html:has(.theme-root[data-theme="kalk"])'));
  });
});
```

- [ ] **Step 2: Kør og se den fejle**

Run: `npx vitest run src/lib/design/kalk-theme.test.ts`
Expected: FAIL med `TypeError` (`kalk["--fg"]` er `undefined`, så `.trim()` fejler).

- [ ] **Step 3: Gør `:root` til Nat-default og tilføj tema-variabler**

I `src/app/globals.css` skal selectoren på **første** token-blok (l. 6, ikke l. 410) ændres fra `:root {` til:

```css
:root,
[data-theme="nat"] {
```

Tilføj nederst i samme blok, lige før `}` (efter `--danger`):

```css
  /* Theme-dependent treatments (Kalk overrides below) */
  --glow: rgba(245, 242, 236, 0.08);
  --vignette-edge: rgba(0, 0, 0, 0.45);
  --grain-blend: overlay;
  --grain-opacity: 0.55;
  --signal-ink: #F5F2EC;
```

Tilføj lige efter blokken en separat `:root`-blok. Display-behandlingen følger **fonten**, ikke farverne. En Nat-flade inde i et Kalk-layout arver Kalk-fonten, så den må ikke nulstille vægten til Archivo-værdien:

```css
/* Display treatment travels with the font stack, not with Nat colours. */
:root {
  --display-weight: 400;
  --display-tracking: -0.025em;
  --display-leading: 0.92;
}
```

- [ ] **Step 4: Tilføj Kalk-blokken lige efter Nat-blokken**

```css
/* ---------------------------------------------------------------- *
 * Kalk — daylight theme (spec 2026-09-17 §3). Same token names,
 * light values. Enabled per surface via <ThemeScope theme="kalk">.
 * html:has(...) lifts it to <html>/<body> so page background,
 * overscroll and root-level UI (cookie bar) follow.
 * ---------------------------------------------------------------- */
html:has(.theme-root[data-theme="kalk"]),
[data-theme="kalk"] {
  color-scheme: light;

  --bg:          #E7E9EB;
  --bg-2:        #F4F5F6;
  --bg-3:        #DCDFE2;
  --bg-elev:     #FFFFFF;

  --fg:          #0D0F12;
  --fg-dim:      #4A4F57;
  --fg-faint:    #5A6069; /* 4.74:1 on --bg-3, 5.21:1 on --bg */

  --line:        rgba(13, 15, 18, 0.10);
  --line-strong: rgba(13, 15, 18, 0.18);
  --line-bright: rgba(13, 15, 18, 0.32);

  --steel:       #DCDFE2;
  --signal:      #E4570F; /* graphic only, never text, never on --bg-3 */
  --signal-ink:  #A8380B; /* orange as text */

  --heart: #BE123C;
  --food:  #116A35;
  --body:  #A8380B;
  --mind:  #1D4ED8;

  /* Custom properties resolve where declared, so tints must be
   * re-declared here or they keep the Nat hues from :root. */
  --heart-tint: color-mix(in oklab, var(--heart) 12%, transparent);
  --food-tint:  color-mix(in oklab, var(--food) 12%, transparent);
  --body-tint:  color-mix(in oklab, var(--body) 12%, transparent);
  --mind-tint:  color-mix(in oklab, var(--mind) 12%, transparent);
  --heart-line: color-mix(in oklab, var(--heart) 32%, transparent);
  --food-line:  color-mix(in oklab, var(--food) 32%, transparent);
  --body-line:  color-mix(in oklab, var(--body) 32%, transparent);
  --mind-line:  color-mix(in oklab, var(--mind) 32%, transparent);

  --mind-energy: #6D28D9;
  --mind-stress: #1D4ED8;
  --mind-focus:  #0E7490;

  --ok:     #166534;
  --warn:   #854D0E;
  --danger: #B91C1C;

  --font-display-stack: var(--font-kalk-display);
  --font-sans-stack:    var(--font-kalk-sans);
  --font-mono-stack:    var(--font-kalk-mono);

  --display-weight: 800;
  --display-tracking: -0.005em;
  --display-leading: 0.88;
  --glow: rgba(255, 255, 255, 0.7);
  --vignette-edge: rgba(13, 15, 18, 0.06);
  --grain-blend: multiply;
  --grain-opacity: 0.35;
}

/* A Nat surface inside a Kalk layout (e.g. /session) wins at <html>.
 * Mirrors every colour token Kalk overrides, so root-level UI
 * (cookie bar, sheets portalled to body) never mixes the two. */
html:has(.theme-root[data-theme="nat"]) {
  color-scheme: dark;
  --bg: #0A0A0B; --bg-2: #111113; --bg-3: #18181B; --bg-elev: #1F1F23;
  --fg: #F5F2EC; --fg-dim: #A8A6A0; --fg-faint: #56554F;
  --line: rgba(245, 242, 236, 0.08);
  --line-strong: rgba(245, 242, 236, 0.18);
  --line-bright: rgba(245, 242, 236, 0.34);
  --steel: #1A1D24; --signal: #F5F2EC; --signal-ink: #F5F2EC;
  --heart: #F2545B; --food: #45C487; --body: #FF9C41; --mind: #5B9DF5;
  --heart-tint: color-mix(in oklab, var(--heart) 12%, transparent);
  --food-tint:  color-mix(in oklab, var(--food) 12%, transparent);
  --body-tint:  color-mix(in oklab, var(--body) 12%, transparent);
  --mind-tint:  color-mix(in oklab, var(--mind) 12%, transparent);
  --heart-line: color-mix(in oklab, var(--heart) 32%, transparent);
  --food-line:  color-mix(in oklab, var(--food) 32%, transparent);
  --body-line:  color-mix(in oklab, var(--body) 32%, transparent);
  --mind-line:  color-mix(in oklab, var(--mind) 32%, transparent);
  --mind-energy: #9F8CFB; --mind-stress: #5B9DF5; --mind-focus: #6FE0E8;
  --ok: #4ADE80; --warn: #FACC15; --danger: #F87171;
  --glow: rgba(245, 242, 236, 0.08);
  --grain-blend: overlay; --grain-opacity: 0.55;
  --vignette-edge: rgba(0, 0, 0, 0.45);
}

.theme-root { background: var(--bg); color: var(--fg); }
```

> Bemærk: et element med `[data-theme="nat"]` får alle Nat-farver fra den første blok, men **ikke** fontene. En Nat-flade i et Kalk-layout (`/session` i F3) bruger altså Kalk-fontene med mørke farver. Det er bevidst: én typografisk stemme. `/coach` har intet scope og beholder de gamle fonte, indtil F4 afgør det. `html:has(… nat)` spejler alle Kalk-farvetokens (testet), så root-UI aldrig blander temaerne. De to mind-serier i Kalk skal tjekkes visuelt i F4. De er ikke en del af tekstporten, fordi de kun bruges som graf-blæk.

- [ ] **Step 5: Lad de tre behandlinger læse variablerne**

`.font-display` (Fase 0 satte `font-weight: 400`):

```css
.font-display {
  font-family: var(--font-display), Impact, "Helvetica Neue", sans-serif;
  /* Archivo Black ships one weight (400); Big Shoulders is variable.
   * The theme picks the weight, synthesis stays off. */
  font-weight: var(--display-weight);
  font-synthesis: none;
  letter-spacing: var(--display-tracking);
  line-height: var(--display-leading);
  text-transform: uppercase;
}
```

`.grain::before`: erstat `opacity: 0.55;` og `mix-blend-mode: overlay;` med `opacity: var(--grain-opacity);` og `mix-blend-mode: var(--grain-blend);`. Lad `background-image` stå. Med `multiply` og lav opacity giver den lyse støj en neutral grå tekstur på Kalk. Juster først, hvis browser-tjekket i Task 7 viser banding.

`.vignette::after`: erstat `rgba(0,0,0,0.45)` med `var(--vignette-edge)`.

- [ ] **Step 6: Kør porten og hele suiten**

Run: `npx vitest run src/lib/design/kalk-theme.test.ts`
Expected: PASS, 33 tests: 22 tekst mod `--bg`/`--bg-2`, 3 neutrale mod `--bg-3`, 2 `--signal` og 6 øvrige (tints, fonte, Nat-base, display følger font, Nat-lift spejler Kalk, lift til `<html>`). Efter Task 4 er der 34.

Run: `npm test`
Expected: alt grønt. `public-landing.test.ts` og `public-anchors.test.ts` læser `globals.css` og må ikke påvirkes.

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css src/lib/design/kalk-theme.test.ts
git commit -m "feat(design): Kalk- og Nat-tema som token-scopes med kontrastport"
```

---

### Task 4: Kalk-fonte

**Files:**
- Modify: `src/app/layout.tsx:1-30` og `className` på `<html>` (l. ~69)
- Test: `src/lib/design/kalk-theme.test.ts`

- [ ] **Step 1: Udvid porten med et font-tjek (fejler)**

Tilføj øverst i `src/lib/design/kalk-theme.test.ts` (efter `const css`):

```ts
const layout = readFileSync(new URL("../../app/layout.tsx", import.meta.url), "utf8");
```

Tilføj i `describe`:

```ts
it("loads the Kalk families under the variables the theme points at", () => {
  expect(layout).toMatch(/Big_Shoulders\(\{[\s\S]*?variable: "--font-kalk-display"/);
  expect(layout).toMatch(/Geist\(\{[\s\S]*?variable: "--font-kalk-sans"/);
  expect(layout).toMatch(/Geist_Mono\(\{[\s\S]*?variable: "--font-kalk-mono"/);
  expect(layout).toContain("kalkDisplay.variable");
});
```

Run: `npx vitest run src/lib/design/kalk-theme.test.ts`
Expected: FAIL på det nye tjek.

- [ ] **Step 2: Tilføj fontene**

```ts
import { Inter, Archivo_Black, JetBrains_Mono, Big_Shoulders, Geist, Geist_Mono } from "next/font/google";

// Kalk (spec 2026-09-17 §3.2). Nat keeps the three above until F4
// removes them. preload: false until a surface opts into Kalk, so
// Nat-only routes don't pay for three extra font files.
const kalkDisplay = Big_Shoulders({
  variable: "--font-kalk-display",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const kalkSans = Geist({
  variable: "--font-kalk-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const kalkMono = Geist_Mono({
  variable: "--font-kalk-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});
```

Og i `<html className>`:

```tsx
className={`${sans.variable} ${display.variable} ${mono.variable} ${kalkDisplay.variable} ${kalkSans.variable} ${kalkMono.variable} h-full antialiased`}
```

- [ ] **Step 3: Verificér**

Run: `npx vitest run src/lib/design/kalk-theme.test.ts && npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: PASS. tsc-tallet er stadig `7` (alle i testfiler, eksisterede før).

Hvis `Big_Shoulders` ikke findes som eksport i den installerede version, så slå det korrekte navn op i `node_modules/next/dist/compiled/@next/font/dist/google/index.d.ts`. Gæt ikke.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/lib/design/kalk-theme.test.ts
git commit -m "feat(design): indlæs Big Shoulders, Geist og Geist Mono til Kalk"
```

---

### Task 5: `ThemeScope`

**Files:**
- Create: `src/components/ui/ThemeScope.tsx`
- Test: `src/components/ui/ThemeScope.test.tsx` (JSX: `react/no-children-prop` forbyder children som prop, og tsc kræver dem)

- [ ] **Step 1: Skriv den fejlende test**

```ts
// src/components/ui/ThemeScope.test.ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ThemeScope from "./ThemeScope";

describe("ThemeScope", () => {
  it("marks its subtree with the theme and the theme-root hook", () => {
    const html = renderToStaticMarkup(
      createElement(ThemeScope, { theme: "kalk", children: "x" }),
    );
    expect(html).toBe('<div data-theme="kalk" class="theme-root">x</div>');
  });

  it("merges layout classes", () => {
    const html = renderToStaticMarkup(
      createElement(ThemeScope, { theme: "nat", className: "flex-1 flex flex-col", children: "x" }),
    );
    expect(html).toContain('data-theme="nat"');
    expect(html).toContain('class="theme-root flex-1 flex flex-col"');
  });
});
```

- [ ] **Step 2: Kør og se den fejle**

Run: `npx vitest run src/components/ui/ThemeScope.test.ts`
Expected: FAIL, fordi modulet mangler.

- [ ] **Step 3: Implementér**

```tsx
// src/components/ui/ThemeScope.tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Theme = "kalk" | "nat";

/**
 * The only way to switch a surface's theme (spec 2026-09-17 §2).
 * globals.css lifts the nearest theme to <html> via :has(), so the
 * page background and root-level UI follow. Server component.
 */
export default function ThemeScope({
  theme,
  className,
  children,
}: {
  theme: Theme;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div data-theme={theme} className={cn("theme-root", className)}>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Kør og se den passere**

Run: `npx vitest run src/components/ui/ThemeScope.test.ts && npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: PASS (2 tests). tsc-tallet er stadig `7`. `children` gives som prop, fordi det er påkrævet i typen, og som tredje argument giver det TS2769.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ThemeScope.tsx src/components/ui/ThemeScope.test.ts
git commit -m "feat(ui): ThemeScope slår Kalk eller Nat til for en flade"
```

---

### Task 6: Pilot, `/login` i Kalk

**Files:**
- Modify: `src/app/login/page.tsx:1-95`
- Test: `src/app/login/page.test.ts`

- [ ] **Step 1: Udvid login-testen (fejler)**

Tilføj i `describe` i `src/app/login/page.test.ts`:

```ts
it("is the Kalk pilot: themed scope, light viewport, no hardcoded glow", () => {
  expect(login).toContain('<ThemeScope theme="kalk"');
  expect(login).toMatch(/export const viewport[\s\S]*?themeColor: "#E7E9EB"/);
  expect(login).not.toMatch(/rgba\(245,\s*242,\s*236/);
});
```

Run: `npx vitest run src/app/login/page.test.ts`
Expected: FAIL på den nye test.

- [ ] **Step 2: Implementér**

Tilføj imports øverst:

```ts
import type { Viewport } from "next";
import ThemeScope from "@/components/ui/ThemeScope";
```

Tilføj efter `generateMetadata` (slå op i `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md`: en statisk `viewport` er tilladt i en `page.tsx`, der er en server component):

```ts
// Kalk pilot (spec 2026-09-17). Merges with the root viewport.
export const viewport: Viewport = {
  themeColor: "#E7E9EB",
  colorScheme: "light",
};
```

Wrap `<main>` i `LoginPage`:

```tsx
return (
  <ThemeScope theme="kalk" className="flex-1 flex flex-col">
    <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-24">
      {/* …uændret indhold… */}
    </main>
  </ThemeScope>
);
```

Erstat glow-klassen:

```tsx
<div className="absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,var(--glow),transparent_70%)] blur-2xl" />
```

- [ ] **Step 3: Kør tests og lint**

Run: `npx vitest run src/app/login && npx eslint src/app/login/page.tsx src/components/ui/ThemeScope.tsx`
Expected: PASS, 0 lint-fejl.

- [ ] **Step 4: Commit**

```bash
git add src/app/login/page.tsx src/app/login/page.test.ts
git commit -m "feat(login): Kalk-pilot med tema-scope og lys viewport"
```

---

### Task 7: Browser-verifikation (PLATFORM_OVERVIEW §8)

- [ ] **Step 1: Start i demo-tilstand**

```bash
lsof -ti:3002 | xargs kill -9 2>/dev/null || true
mv .env.local .env.local.bak
nohup env PORT=3002 npm run dev > /tmp/kalk-dev.log 2>&1 &
until grep -q "Ready" /tmp/kalk-dev.log; do sleep 1; done
grep -c "Environments: .env.local" /tmp/kalk-dev.log   # skal give 0
```

> `.env.local.bak` **skal** flyttes tilbage i Step 4, også hvis et tjek fejler.

- [ ] **Step 2: Tjek `/login` på 390×844 og 1440×900**

Tjek følgende:
- Baggrunden er `#E7E9EB` helt ud til kanten, også ved overscroll.
- Overskriften står i Big Shoulders. Computed `font-family` skal begynde med den.
- Knappen er en sort pille med lys tekst. Hover inverterer den.
- Fokusringen er synlig på invite-feltet.
- Cookie-baren er lys.
- Grain giver ingen banding.
- Konsol: 0 fejl, bortset fra den kendte service worker-fejl i browser-panelet.

Tag screenshots af begge bredder.

- [ ] **Step 3: Regressionstjek**

- `/` (landing): uændret og mørk.
- `/dashboard` efter login: uændret og mørk.
- `/coach`: uændret og mørk.

- [ ] **Step 4: Ryd op og lav den samlede kørsel**

```bash
lsof -ti:3002 | xargs kill -9 2>/dev/null || true
mv .env.local.bak .env.local
npm test && npm run lint && npm run build
npx tsc --noEmit 2>&1 | grep -c "error TS"   # skal give 7
```

Expected: alt grønt, og build viser ingen font-advarsler. tsc-tallet er uændret `7`.

- [ ] **Step 5: Afslut fasen**

Sæt flueben ved F1 under Status nederst, og commit:

```bash
git add docs/superpowers/plans/2026-09-17-kalk-redesign.md
git commit -m "docs(plan): F1 Kalk-fundament leveret"
```

---

## Chunk 2: F2-F5 (rammer for de næste planer)

De næste faser får hver deres detaljerede plan, når F1 er leveret. Rammerne her er låst.

### F2 Landing (spec §5)

**Nye filer:** `src/components/marketing/kalk/`
- `KalkNav`
- `KalkHero` (vægtskive-tal, én telefon)
- `MotorStory` (C2-graf og A1 sticky rig, IntersectionObserver-klient-ø)
- `SystemsBento`
- `ScreenRack` (scroll-snap og knapper)
- `KalkMunk` (C3-flow, A4-signatur)
- `CrewPlates` (C4-markører)
- `Voices` (A3)
- `AccessPanel` (Nat-scope)
- `KalkFaq`
- `KalkFooter`

**Delt:** `src/components/marketing/phone/PhoneFrame.tsx` og én fil pr. skærm (`DashboardScreen`, `SessionScreen`, `HrvScreen`, `FoodScreen`, `MindScreen`, `FormCheckScreen`, `DecisionScreen`). De skal kunne udskiftes med ægte skærmbilleder, når F5 lander.

**Øvelsesvisuals (spec §3.4):** skærmene og Munk-sektionen bruger de bundlede MoveKit-loops fra `/exercise-demos/*` via `resolveDemoAssets`. Der må ikke være SVG-figurer. Loopet vises på `--bg-2` med `mix-blend-mode: multiply` og afspilles kun, når det er i syne. Et nyt, delt `DemoLoop`-komponent med IntersectionObserver, reduceret bevægelse og pause-knap bruges både her og af `ExerciseDemo` i F3. Referencen er koncept B v2, hvor pindefiguren er erstattet af `back-squat`-loopet.

**Copy:** ny nøglegruppe `Marketing.kalk.*` i da og en. De gamle nøgler slettes først, når de gamle komponenter er fjernet.

**Udrulning:** `src/app/page.tsx` renderer Kalk-landingen bag et build-flag, mens den gamle side lever videre. Flaget slås til efter Toms godkendelse på preview.

**Porte:**
- højde ≤ 10.000 px ved 1440 og ≤ 15.000 px ved 390,
- nul `—`/`–` i `Marketing.kalk` (vitest),
- eyebrow-tæller ≤ 3,
- anker-ID'erne bevaret (`public-anchors.test.ts`),
- A1 har statisk fallback uden JS og ved reduceret bevægelse,
- C1 vises som "Behold original" (funktionen findes).

**Fjernes:**
- `CustomCursor`, `Spotlight` og Lenis fra root-layoutet (kun brugt af landingen),
- den hardcodede medlemsstat (D5),
- `Marquee` (erstattes af rack-grid).

### F3 App-kerne (spec §6)

**Primitiver i `src/components/ui/`:**
- `PageTitle`
- `SectionHeader`
- `Card` (`quiet` og `primary`)
- `EmptyState`
- `Stat`
- `Field` (samler `.input` og `.field`, 16 px tekst på touch, så `maximumScale: 1` kan fjernes fra root-viewport).

Hver primitiv får en render-test.

**Dashboard:** rækkefølgen omlægges til hilsen, dagens pas, `MorningSignal` (C5, ny komponent), besked fra Munk og resten. A2-chips genbruger data fra `engine-strip.ts` og `AdaptiveReasonStrip`.

**Navigation:** `MobileTabBar` får 5 faner, og den døde ulæst-badge fjernes. `AppShell` får avatar-menuen "Mig" og en HRV-indgang via `MorningSignal`. Den aktive indikator bruger `--signal`.

**Øvelser:** `ExerciseDemo` og `SessionExerciseDemo` flyttes over på `DemoLoop` fra F2. På Kalk-flader bruges multiply-blend. Form-check-skærmen viser medlemmets optagelse først og MoveKit-referencen bagefter (spec §3.4).

**Tema:** `(app)/layout.tsx` wrapper i `ThemeScope theme="kalk"`. `session/[id]/page.tsx` wrapper i `ThemeScope theme="nat"`. `/coach` røres ikke.

**Porte:**
- alle 38 `(app)`-sider er screenshot-tjekket i Kalk på 390 px,
- `/session` er mørk og har ingen lys overscroll.

### F4 App-flader

**Migrering:** de 19 sider uden `PageHeader` går over på primitiverne, og de 94 håndbyggede eyebrows bliver til `SectionHeader`.

**Farver:**
- Alle mørke literals i app-filerne (spec §0) erstattes med tokens. Mailskabeloner er undtaget.
- `#C97B3E` og `#4CAF7D` bliver domæne-tokens.
- Mind-seriefarverne tjekkes visuelt i Kalk.

**Hardcodet copy:** HRV og Mind flyttes til `messages/` (reviewets fund).

**Native:** `NativeBridge` sætter statusbar-stil ud fra `color-scheme` på `<html>`. `capacitor.config.ts` `backgroundColor` bliver `#E7E9EB`. Splash og ikon følger først ved næste butiksudgivelse (D3), og kun med Toms accept.

**Oprydning:** om Inter, Archivo Black og JetBrains Mono skal fjernes, er en beslutning til Tom ved F4-start. Anbefalingen er, at Nat beholder Kalk-fontene med mørke farver, så der kun er én typografisk stemme.

### F5 Assets

**Brief:** `docs/briefs/kalk-assets.md` beskriver portrætshoot af Munk (monokromt, så det passer til både Kalk og Nat), ægte demo-skærmbilleder i 1290×2796 (genbruges til App Store) og tre citater med samtykke.

**Afløser:** `PhoneFrame` får en `src`-variant, der viser et billede i stedet for en tegnet skærm.

### C1 "Behold original"

Findes allerede i `AdaptationCard`, så der er ikke noget motor-spor. F2 viser knappen på beslutningsskærmen, og F3 flytter den frem på dagens pas.

---

## Status

- [x] F1 Fundament (2026-09-17, branch `claude/kalk-redesign`)
- [x] F2 Landing (#102, bag `LANDING_VARIANT`; Preview-env sat 2026-09-17)
- [ ] F3 App-kerne
- [ ] F4 App-flader
- [ ] F5 Assets (Tom)
