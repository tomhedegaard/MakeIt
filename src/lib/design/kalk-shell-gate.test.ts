import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const files: (readonly [string, string])[] = [
  "../../components/app", "../../components/dashboard", "../../components/ui",
].flatMap((d) => readdirSync(new URL(d + "/", import.meta.url))
  .filter((f) => f.endsWith(".tsx") && !f.includes(".test."))
  .map((f) => [f, readFileSync(new URL(`${d}/${f}`, import.meta.url), "utf8")] as const));
const layout = readFileSync(new URL("../../app/layout.tsx", import.meta.url), "utf8");
files.push(["dashboard/page.tsx", readFileSync(new URL("../../app/(app)/dashboard/page.tsx", import.meta.url), "utf8")]);

describe("Kalk shell gate", () => {
  it("lets people zoom (WCAG 1.4.4)", () => {
    expect(layout).not.toMatch(/maximumScale/);
  });

  it.each(files)("%s has no dark-only literals", (_f, src) => {
    expect(src).not.toMatch(/#0A0A0B|#F5F2EC|rgba\(245,\s?242,\s?236|rgba\(10,\s?10,\s?11/i);
    expect(src).not.toMatch(/\b(bg-black|text-white|bg-white|text-black)\b/);
  });
});

describe("no iOS focus zoom on touch", () => {
  const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
  const tagClass = (src: string, tag: string) =>
    [...src.matchAll(new RegExp(`<${tag}\\b[\\s\\S]*?className="([^"]*)"`, "g"))].map((m) => m[1]);

  it.each([
    ["chat Composer textarea", "../../components/chat/Composer.tsx", "textarea"],
    ["CounterfactualSliders select", "../../components/adaptive/CounterfactualSliders.tsx", "select"],
  ])("%s is 16px on small screens", (_name, path, tag) => {
    const classes = tagClass(read(path), tag);
    expect(classes.length).toBeGreaterThan(0);
    for (const c of classes) {
      const tokens = c.split(/\s+/);
      const ok = tokens.includes("input") || tokens.includes("field") ||
        (tokens.includes("text-base") && !tokens.includes("text-sm"));
      expect(ok, c).toBe(true);
    }
  });
});
