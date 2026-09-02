import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const da = JSON.parse(
  readFileSync(new URL("../../../messages/da/Marketing.json", import.meta.url), "utf8"),
) as Record<string, unknown>;
const en = JSON.parse(
  readFileSync(new URL("../../../messages/en/Marketing.json", import.meta.url), "utf8"),
) as Record<string, unknown>;

function keysOf(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    keysOf(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe("landing loop copy", () => {
  it("keeps da and en loop keys in lockstep", () => {
    expect(keysOf(da.loop)).toEqual(keysOf(en.loop));
  });

  it("hero names the week in one body and keeps invite scarcity — no free trial", () => {
    const daHero = da.hero as { subline2: string; eyebrow: string; ctaPrimary: string };
    const enHero = en.hero as { subline2: string; eyebrow: string; ctaPrimary: string };
    expect(daHero.subline2).toMatch(/ugen bor i én krop/i);
    expect(enHero.subline2).toMatch(/week lives in one body/i);
    expect(daHero.eyebrow).toMatch(/invite/i);
    expect(enHero.eyebrow).toMatch(/invite/i);
    expect(daHero.ctaPrimary).not.toMatch(/prøve|gratis|trial/i);
    expect(enHero.ctaPrimary).not.toMatch(/free trial|trial/i);
    expect(daHero.subline2).not.toMatch(/<heart>|<body>|<mind>|<food>/);
    expect(enHero.subline2).not.toMatch(/<heart>|<body>|<mind>|<food>/);
  });

  it("gallery framing does not steal the three-beat story", () => {
    const daApp = da.app as { heading: string; intro: string };
    const enApp = en.app as { heading: string; intro: string };
    expect(daApp.heading).toMatch(/otte skærme/i);
    expect(enApp.heading).toMatch(/eight screens/i);
    expect(daApp.intro).toMatch(/bevis/i);
    expect(enApp.intro).toMatch(/evidence/i);
  });
});
