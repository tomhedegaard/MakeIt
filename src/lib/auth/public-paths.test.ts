import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  isPublicPath,
  needsAuth,
  normalizePathname,
  publicRedirectFor,
} from "./public-paths";

const APP_DIR = fileURLToPath(new URL("../../app", import.meta.url));

/** Marketing / legal / login pages that are allowed to be public.
 *  Redirect aliases are public *as redirects*, not app surfaces. */
const PUBLIC_PAGE_PATHS = new Set([
  "/",
  "/login",
  "/privacy",
  "/terms",
  "/waitlist",
  "/join",
  "/signup",
  "/legal",
]);

describe("normalizePathname", () => {
  it("strips query, hash, and a trailing slash", () => {
    expect(normalizePathname("/mind/?x=1#y")).toBe("/mind");
    expect(normalizePathname("/login/")).toBe("/login");
  });

  it("keeps the root slash", () => {
    expect(normalizePathname("/")).toBe("/");
    expect(normalizePathname("/?ref=crew")).toBe("/");
  });
});

describe("isPublicPath", () => {
  it.each([
    "/",
    "/login",
    "/login?next=/mind",
    "/privacy",
    "/terms",
    "/science/feed.json",
    "/science/feed.xml",
    "/auth/callback",
    "/.well-known/apple-app-site-association",
    "/.well-known/assetlinks.json",
    "/manifest.webmanifest",
    "/sw.js",
    "/offline.html",
    "/waitlist",
    "/join",
    "/signup",
    "/legal",
    "/waitlist/",
  ])("admits %s", (path) => {
    expect(isPublicPath(path)).toBe(true);
    expect(needsAuth(path)).toBe(false);
  });

  it("does not treat `/` as a prefix of member routes", () => {
    expect(isPublicPath("/mind")).toBe(false);
    expect(isPublicPath("/hrv")).toBe(false);
  });

  it("does not treat redirect aliases as prefixes of member routes", () => {
    expect(isPublicPath("/waitlist/admin")).toBe(false);
    expect(isPublicPath("/join/crew")).toBe(false);
    expect(isPublicPath("/legal/export")).toBe(false);
  });
});

describe("publicRedirectFor", () => {
  it("maps guessed marketing URLs to existing public surfaces", () => {
    expect(publicRedirectFor("/waitlist")).toBe("/#waitlist");
    expect(publicRedirectFor("/join")).toBe("/login");
    expect(publicRedirectFor("/signup")).toBe("/login");
    expect(publicRedirectFor("/legal")).toBe("/privacy");
  });

  it("does not invent destinations for member routes", () => {
    expect(publicRedirectFor("/hrv/learn/adaptive")).toBeNull();
    expect(publicRedirectFor("/dashboard")).toBeNull();
  });
});

describe("needsAuth", () => {
  it.each([
    "/mind",
    "/mind/journal",
    "/hrv",
    "/nutrition",
    "/messages",
    "/buddy",
    "/science",
    "/coach-school",
    "/program/foo",
    "/dashboard",
    "/coach",
    "/onboarding",
    "/api/settings/export",
    "/api/cron/science-feed",
  ])("requires a session for %s", (path) => {
    expect(needsAuth(path)).toBe(true);
    expect(isPublicPath(path)).toBe(false);
  });
});

describe("app page inventory", () => {
  it("protects every page.tsx that is not an explicit public surface", () => {
    const pages = collectPagePaths(APP_DIR);
    expect(pages.length).toBeGreaterThan(20);
    expect(pages).toContain("/mind");
    expect(pages).toContain("/hrv");
    expect(pages).toContain("/");

    const leaked = pages.filter(
      (path) => !PUBLIC_PAGE_PATHS.has(path) && isPublicPath(path),
    );
    expect(leaked).toEqual([]);

    const forgotten = pages.filter(
      (path) => !PUBLIC_PAGE_PATHS.has(path) && !needsAuth(path),
    );
    expect(forgotten).toEqual([]);
  });
});

function collectPagePaths(dir: string, urlParts: string[] = []): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const group = entry.name.startsWith("(") && entry.name.endsWith(")");
      const next = group ? urlParts : [...urlParts, entry.name];
      out.push(...collectPagePaths(full, next));
      continue;
    }
    if (entry.name === "page.tsx" || entry.name === "page.ts") {
      out.push(urlParts.length === 0 ? "/" : `/${urlParts.join("/")}`);
    }
  }
  return out;
}
