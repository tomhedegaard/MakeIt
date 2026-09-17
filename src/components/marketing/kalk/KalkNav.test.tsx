import { describe, expect, it } from "vitest";
import { render } from "../test-render";
import KalkNav from "./KalkNav";

const html = render(<KalkNav />);
const SECTIONS = ["#engine", "#systems", "#munk", "#crew"];

describe("KalkNav", () => {
  it("links to at most the four sections, in every menu", () => {
    const hrefs = [...html.matchAll(/href="(#[^"]*)"/g)].map((m) => m[1]);
    expect(new Set(hrefs)).toEqual(new Set(SECTIONS));
    const desktop = html.match(/<ul[^>]*data-nav="desktop"[^>]*>([\s\S]*?)<\/ul>/)?.[1] ?? "";
    const menu = html.match(/<details[\s\S]*?<\/details>/)?.[0] ?? "";
    for (const list of [desktop, menu]) {
      const found = [...list.matchAll(/href="(#[^"]*)"/g)].map((m) => m[1]);
      expect(found).toEqual(SECTIONS);
    }
  });

  it("has login and the access CTA to the public destinations", () => {
    expect(html).toMatch(/<a[^>]*href="\/login"[^>]*>Log ind<\/a>/);
    expect(html).toMatch(/<a[^>]*class="[^"]*btn btn-primary[^"]*"[^>]*href="\/#waitlist"[^>]*>Få adgang<\/a>|<a[^>]*href="\/#waitlist"[^>]*class="[^"]*btn btn-primary[^"]*"[^>]*>Få adgang<\/a>/);
  });

  it("keeps one line from 1024 px and a no-JS details menu below", () => {
    const cls = html.match(/<ul[^>]*data-nav="desktop"[^>]*class="([^"]*)"/)?.[1].split(" ") ?? [];
    expect(cls).toEqual(expect.arrayContaining(["hidden", "lg:flex", "whitespace-nowrap"]));
    expect(html).toMatch(/<details[^>]*class="[^"]*lg:hidden/);
    expect(html).toContain("<summary");
    expect(html).not.toContain("<button");
  });
});
