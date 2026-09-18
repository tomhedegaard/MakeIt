import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PUBLIC_LEARN_HREF, PUBLIC_WAITLIST_HREF } from "@/lib/marketing/public-cta";

const kalkDir = new URL("./kalk/", import.meta.url);
const sources = readdirSync(kalkDir)
  .filter((f) => f.endsWith(".tsx") && !f.includes(".test."))
  .map((f) => [f, readFileSync(new URL(f, kalkDir), "utf8")] as const);
const all = sources.map(([, s]) => s).join("\n");

const ids = new Set([...all.matchAll(/\bid="([\w-]+)"/g)].map((m) => m[1]));
const anchors = [...all.matchAll(/href(?:=|:\s*)"#([\w-]+)"/g)].map((m) => m[1]);

describe("Kalk landing anchors", () => {
  it("points every in-page link at an id the landing renders", () => {
    expect(anchors.length).toBeGreaterThan(0);
    for (const a of anchors) expect(ids, `#${a}`).toContain(a);
  });

  it("resolves the public CTA anchors on /", () => {
    for (const href of [PUBLIC_WAITLIST_HREF, PUBLIC_LEARN_HREF]) {
      expect(href.startsWith("/#"), href).toBe(true);
      expect(ids, href).toContain(href.slice(2));
    }
  });

  it("links only to public routes, never straight into the member app", () => {
    const routes = [...all.matchAll(/href="(\/[^"#]*)/g)].map((m) => m[1]);
    for (const r of routes) expect(["/", "/privacy", "/terms", "/login"], r).toContain(r);
  });
});

describe("Kalk hero fail-open", () => {
  it("renders the hero copy without a hidden Framer initial state", () => {
    const hero = readFileSync(new URL("./kalk/KalkHero.tsx", import.meta.url), "utf8");
    expect(hero).toContain("<h1");
    expect(hero).not.toMatch(/framer-motion|initial=\{\{\s*opacity:\s*0/);
  });
});
