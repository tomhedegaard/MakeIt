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
