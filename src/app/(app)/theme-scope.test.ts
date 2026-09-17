// src/app/(app)/theme-scope.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const layout = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");
const session = readFileSync(new URL("./session/[id]/page.tsx", import.meta.url), "utf8");
const sessionLoading = readFileSync(new URL("./session/[id]/loading.tsx", import.meta.url), "utf8");
const appLoading = readFileSync(new URL("./loading.tsx", import.meta.url), "utf8");

describe("app theme scopes (spec §2, §6)", () => {
  it("gives the Kalk wrapper a definite mobile height so the tab bar stays pinned", () => {
    // flex-1 (basis 0) in the auto-height body let the wrapper grow to
    // content height, pushing the tab bar below the fold.
    const cls = layout.match(/<ThemeScope theme="kalk" className="([^"]+)"/)?.[1] ?? "";
    expect(cls.split(" ")).toEqual(expect.arrayContaining(["h-dvh", "lg:h-auto", "lg:minh-dvh", "lg:flex-1"]));
    // Desktop keeps growing with content (sticky sidebar, page scroll).
    expect(cls.split(" ")).not.toContain("flex-1");
  });

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

  // No light flash before the dark session: the session's own boundary is
  // Nat, and the (app) boundary (the first one a dynamic prefetch reaches)
  // turns Nat on /session too. Both share one skeleton.
  it("shows the loading skeleton in Nat on /session", () => {
    expect(sessionLoading).toContain('<ThemeScope theme="nat" className="minh-dvh">');
    expect(sessionLoading).toContain("<AppLoadingSkeleton");
    expect(appLoading).toContain("<AppLoadingSkeleton");
    expect(appLoading).toContain("<LoadingTheme");
  });
});
