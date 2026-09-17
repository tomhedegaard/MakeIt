import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("theme scopes (spec §2)", () => {
  it("/coach is explicitly Nat with dark browser chrome", () => {
    const src = read("app/coach/layout.tsx");
    expect(src).toMatch(/<ThemeScope theme="nat"/);
    expect(src).toMatch(/colorScheme: "dark"/);
  });

  it("/onboarding is Kalk with light browser chrome", () => {
    const src = read("app/onboarding/layout.tsx");
    expect(src).toMatch(/<ThemeScope theme="kalk"/);
    expect(src).toMatch(/colorScheme: "light"/);
  });
});
