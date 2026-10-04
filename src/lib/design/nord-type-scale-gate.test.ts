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
const EXEMPT = /\/(marketing|landing)\//;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

export const RAW_SIZE = /(?<![\w-])(?:[a-z0-9-]+:)*text-(?:xs|sm|base|lg|xl|[2-9]xl|\[[\d.]+(?:px|rem)\])(?![\w\-[])/;

const files = ROOTS.flatMap((r) => walk(join(SRC, r)))
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
