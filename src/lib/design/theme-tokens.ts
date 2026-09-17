/**
 * Reads `--custom-property` declarations for one selector out of a CSS
 * string. Matches innermost `selector { … }` pairs, so rules inside
 * @media are read as well. Used by design-gate tests, not at runtime.
 *
 * Limitation: braces or semicolons inside quoted strings / data URLs are
 * not supported; token values in globals.css must stay plain.
 */
const RULE = /([^{}]+)\{([^{}]*)\}/g;

export function readThemeTokens(css: string, selector: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  const clean = css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@[^{};]+;/g, "");
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
