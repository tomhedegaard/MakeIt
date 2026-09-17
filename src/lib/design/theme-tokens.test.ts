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

  it("skips a leading statement at-rule like @import", () => {
    const withImport = `@import "tailwindcss";\n\n:root {\n  --bg: #000000;\n}`;
    expect(readThemeTokens(withImport, ":root")).toEqual({ "--bg": "#000000" });
  });
});
