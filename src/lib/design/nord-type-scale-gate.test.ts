import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Én type-skala (spec §4, DESIGN.md): medlems- og coach-flader bruger kun
// text-micro/-meta/-copy/-card/-section/-title/-hero(-lg). Rå Tailwind-
// størrelser og håndrullede px-værdier er præcis den drift, skalaen skulle
// standse. Landing/marketing har sin egen skala og er undtaget.
const SRC = fileURLToPath(new URL("../../", import.meta.url));
const ROOTS = ["app/(app)", "app/coach", "app/onboarding", "app/login", "components"];
const ROOT_FILES = ["app/error.tsx", "app/loading.tsx"];
ROOTS.push("app/privacy", "app/terms");
const EXEMPT = /\/(marketing|landing)\//;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

export const RAW_SIZE = /(?<![\w-])(?:[a-z0-9-]+:)*text-(?:xs|sm|base|lg|xl|[2-9]xl|\[[\d.]+(?:px|rem)\])(?![\w\-[])/;

const files = [...ROOTS.flatMap((r) => walk(join(SRC, r))), ...ROOT_FILES.map((f) => join(SRC, f))]
  .map((p) => relative(SRC, p))
  .filter((p) => /\.tsx?$/.test(p) && !/\.test\./.test(p) && !EXEMPT.test(`/${p}`));

describe("member and coach surfaces use the Nord type scale (spec §4)", () => {
  it.each(files)("%s", (p) => {
    const hit = readFileSync(join(SRC, p), "utf8").match(RAW_SIZE);
    expect(hit?.[0] ?? null, "rå tekststørrelse; brug text-micro/meta/copy/card/section/title/hero").toBeNull();
  });

  it("catches what it is meant to catch (self-test)", () => {
    expect('className="text-sm text-fg-dim"').toMatch(RAW_SIZE);
    expect('className="md:text-2xl"').toMatch(RAW_SIZE);
    expect('className="text-[13px]"').toMatch(RAW_SIZE);
    expect('className="text-meta text-fg-dim md:text-section"').not.toMatch(RAW_SIZE);
    expect('className="text-hero-lg"').not.toMatch(RAW_SIZE);
  });
});

// Rollerne bag skalaen (DESIGN.md): én vægt-familie (400/500), en
// sidetitel er h1, og overskrifter er aldrig kicker-små. Tokenet bærer
// sin egen linjehøjde, så en leading-* på en overskrift er drift.
const HEAVY = /\bfont-(?:semibold|bold|extrabold|black)\b/;
const SUBHEAD_AS_TITLE = /<h[23]\b[^>]*className=[^>]*\btext-(?:title|hero(?:-lg)?)\b/;
const HEADING_AS_LABEL = /<h[1-3]\b[^>]*className=["'`{][^>]*\b(?:text-micro|text-meta|eyebrow)\b/;
// text-micro er til tidsstempler, chips og tabelhoveder, ikke sætninger.
const SENTENCE_AS_MICRO = /<p\b[^>]*className=[^>]*\btext-micro\b/;
// h3 er en korttitel (text-card); en sektionstitel er h2.
const H3_AS_SECTION = /<h3\b[^>]*className=[^>]*\btext-section\b/;
// Knapper og links er handlinger, ikke tidsstempler: mindst text-meta.
// Matcher hele åbnings-tagget, også når className står på en ny linje.
const ACTION_AS_MICRO = /<(?:button|a|Link)\b[^<>]*?\btext-micro\b[^<>]*?>/;
// Tokenet bærer linjehøjden; leading-* ved siden af er drift.
const TOKEN_LEADING = /\btext-(?:micro|meta|copy|card|section|title|hero(?:-lg)?)\b[^"'`\n]*\bleading-|\bleading-[^"'`\s]+[^"'`\n]*\btext-(?:micro|meta|copy|card|section|title|hero(?:-lg)?)\b/;
const HEADING_LEADING = /\btext-(?:section|title|hero(?:-lg)?)\b[^"'`]*\bleading-|\bleading-[^"'`\s]+[^"'`]*\btext-(?:section|title|hero(?:-lg)?)\b/;

describe("type roles hold (DESIGN.md)", () => {
  it.each(files)("%s", (p) => {
    const lines = readFileSync(join(SRC, p), "utf8").split("\n");
    const bad = lines
      .map((l, i) => ({ l, i: i + 1 }))
      .filter(({ l }) => HEAVY.test(l) || SUBHEAD_AS_TITLE.test(l) || HEADING_AS_LABEL.test(l) || HEADING_LEADING.test(l) || SENTENCE_AS_MICRO.test(l) || H3_AS_SECTION.test(l))
      .map(({ l, i }) => `${i}: ${l.trim().slice(0, 120)}`);
    expect(bad).toEqual([]);
    const src = lines.join("\n");
    expect(src.match(ACTION_AS_MICRO)?.[0] ?? null).toBeNull();
    expect(lines.filter((l) => TOKEN_LEADING.test(l)).map((l) => l.trim().slice(0, 120))).toEqual([]);
  });

  it("catches what it is meant to catch (self-test)", () => {
    expect('className="font-semibold"').toMatch(HEAVY);
    expect('<h2 className="font-display text-title">').toMatch(SUBHEAD_AS_TITLE);
    expect('<h1 className="text-title">').not.toMatch(SUBHEAD_AS_TITLE);
    expect('<h2 className="eyebrow">').toMatch(HEADING_AS_LABEL);
    expect('<h3 className="text-card">').not.toMatch(HEADING_AS_LABEL);
    expect('className="text-section leading-tight"').toMatch(HEADING_LEADING);
    expect('className="text-copy leading-relaxed"').not.toMatch(HEADING_LEADING);
    expect('<p className="text-micro text-fg-faint">').toMatch(SENTENCE_AS_MICRO);
    expect('<span className="text-micro">').not.toMatch(SENTENCE_AS_MICRO);
    expect('<h3 className="font-display text-section">').toMatch(H3_AS_SECTION);
    expect('<button\n  type="button"\n  className="text-micro">').toMatch(ACTION_AS_MICRO);
    expect('<button className="text-meta">').not.toMatch(ACTION_AS_MICRO);
    expect('className="text-copy leading-relaxed"').toMatch(TOKEN_LEADING);
  });
});

// Kun tokens: Tailwinds rå paletfarver (bg-amber-700, text-red-400 …) er
// den gamle mørke æras rester og omgår både Nord og nat (DESIGN.md).
const RAW_PALETTE = /\b(?:bg|text|border|ring|fill|stroke)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b/;

describe("member and coach surfaces use colour tokens only", () => {
  it.each(files)("%s", (p) => {
    expect(readFileSync(join(SRC, p), "utf8").match(RAW_PALETTE)?.[0] ?? null).toBeNull();
  });

  it("catches what it is meant to catch (self-test)", () => {
    expect('className="bg-amber-700/30"').toMatch(RAW_PALETTE);
    expect('className="text-danger border-domain"').not.toMatch(RAW_PALETTE);
  });
});
