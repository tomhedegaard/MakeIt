// src/app/(app)/theme-scope.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const layout = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");
const session = readFileSync(new URL("./session/[id]/page.tsx", import.meta.url), "utf8");

describe("app theme scopes (spec §2, §6)", () => {
  it("runs the member app in Kalk with a light browser chrome", () => {
    expect(layout).toContain('<ThemeScope theme="kalk"');
    expect(layout).toMatch(/export const viewport[\s\S]*?themeColor: "#E7E9EB"/);
  });

  it("keeps the live session in Nat with a dark browser chrome", () => {
    expect(session).toContain('<ThemeScope theme="nat"');
    expect(session).toMatch(/export const viewport[\s\S]*?themeColor: "#0A0A0B"/);
  });

  // Next merges metadata shallowly: a segment's appleWebApp replaces the
  // root object wholesale, so capable + title must be restated.
  it("gives the iOS PWA dark status text on Kalk and light text in the session", () => {
    expect(layout).toMatch(
      /export const metadata[\s\S]*?appleWebApp: \{[^}]*capable: true[^}]*statusBarStyle: "default"[^}]*title: COMPANY\.name/,
    );
    expect(session).toMatch(
      /export const metadata[\s\S]*?appleWebApp: \{[^}]*capable: true[^}]*statusBarStyle: "black-translucent"[^}]*title: COMPANY\.name/,
    );
  });
});
