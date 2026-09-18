import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (l: string) =>
  JSON.parse(readFileSync(new URL(`../../../../messages/${l}/Marketing.json`, import.meta.url), "utf8"));
const da = read("da").kalk as Record<string, unknown>;
const en = read("en").kalk as Record<string, unknown>;

function paths(v: unknown, p = ""): string[] {
  if (typeof v === "string") return [p];
  if (!v || typeof v !== "object") return [];
  return Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => paths(x, p ? `${p}.${k}` : k));
}
function strings(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (!v || typeof v !== "object") return [];
  return Object.values(v as Record<string, unknown>).flatMap(strings);
}

describe("Marketing.kalk copy gate (spec §5, §8)", () => {
  it("exists in both locales with identical keys", () => {
    expect(da).toBeTruthy();
    expect(paths(da).sort()).toEqual(paths(en).sort());
  });

  it("has no em or en dashes", () => {
    for (const s of [...strings(da), ...strings(en)]) expect(s).not.toMatch(/[–—]/);
  });

  it("uses at most three eyebrows", () => {
    expect(paths(da).filter((k) => k.endsWith(".eyebrow")).length).toBeLessThanOrEqual(3);
  });

  it("makes no member-count or price claims and names no vendor", () => {
    const blob = [...strings(da), ...strings(en)].join("\n");
    expect(blob).not.toMatch(/\b412\b|aktive medlemmer|active members/i);
    expect(blob).not.toMatch(/kr\.?\s?\d|DKK|€|\$\d/i);
    expect(blob).not.toMatch(/Claude|Anthropic|MoveKit/i);
  });

  it("keeps the Danish H1 and the English slogan (D4)", () => {
    const hero = da.hero as { heading: string };
    const footer = da.footer as { slogan: string };
    expect(hero.heading).toBe("Bygget til dem der løfter.");
    expect(footer.slogan).toBe("Made for those who lift.");
  });

  it("uses one CTA label for the access intent", () => {
    const d = da as Record<string, Record<string, string>>;
    expect(d.nav.cta).toBe(d.hero.cta);
    expect(d.hero.cta).toBe("Få adgang");
  });

  it("har copy til motor-demoen", () => {
    const demo = da.demo as Record<string, string>;
    expect(demo.sleepLabel).toBeTruthy();
    expect(demo.hrvLabel).toBeTruthy();
    expect(demo.stressLabel).toBeTruthy();
    expect(demo.bandNote).toMatch(/demo/i);
    expect(demo.keepOriginal).toBeTruthy();
  });

  it("siger at demo-båndet er et eksempel, ikke et løfte", () => {
    expect((da.demo as Record<string, string>).bandNote).toMatch(/dit eget|din egen/i);
  });

  it("svarer på om demoen er den rigtige motor", () => {
    const faq = da.faq as Record<string, unknown>;
    const blob = JSON.stringify(faq);
    expect(blob).toMatch(/samme motor|den rigtige motor/i);
    expect(blob).toMatch(/forlader aldrig|sendes ikke/i);
  });
});
