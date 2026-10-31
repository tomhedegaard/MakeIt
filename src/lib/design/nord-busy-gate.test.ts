import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Optaget er ikke slukket (UI-REVIEW-9): en knap der får disabled mens en
// server-handling kører, smider fokus til <body>. Medlems- og coach-flader
// bruger aria-disabled={pending} + en guard i handleren; disabled er kun til
// ægte ugyldige tilstande (tom formular o.l.).
const SRC = fileURLToPath(new URL("../../", import.meta.url));
const ROOTS = ["app/(app)", "app/coach", "app/onboarding", "app/login", "components"];
const EXEMPT = /\/(marketing|landing)\//;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

export const DISABLED_WHILE_PENDING = /(?<![\w-])disabled=\{[^{}]*\b\w*[pP]ending\b[^{}]*\}/;

const files = ROOTS.flatMap((r) => walk(join(SRC, r)))
  .map((p) => relative(SRC, p))
  .filter((p) => /\.tsx?$/.test(p) && !/\.test\./.test(p) && !EXEMPT.test(`/${p}`));

describe("busy buttons keep focus (aria-disabled, not disabled)", () => {
  it.each(files)("%s", (p) => {
    const hit = readFileSync(join(SRC, p), "utf8").match(DISABLED_WHILE_PENDING);
    expect(hit?.[0] ?? null, "brug aria-disabled={pending} + guard i handleren").toBeNull();
  });

  it("catches what it is meant to catch (self-test)", () => {
    expect("disabled={pending}").toMatch(DISABLED_WHILE_PENDING);
    expect("disabled={isPending}").toMatch(DISABLED_WHILE_PENDING);
    expect("disabled={pending || !text.trim()}").toMatch(DISABLED_WHILE_PENDING);
    expect("disabled={profilePending}").toMatch(DISABLED_WHILE_PENDING);
    expect("aria-disabled={pending}").not.toMatch(DISABLED_WHILE_PENDING);
    expect("disabled={!hasDays}").not.toMatch(DISABLED_WHILE_PENDING);
  });
});
