import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Touch-target floor for the member app (UX review 2026-09-19).
 *
 * The report measured a set of controls at 15–36px. These are source
 * gates on the spots it named: the shared button tokens plus the four
 * surfaces whose controls set their own height.
 */
const read = (rel: string) =>
  readFileSync(new URL(rel, import.meta.url), "utf8");

describe("button height tokens (globals.css)", () => {
  const css = read("../../app/globals.css");

  it("keeps .btn at 44px", () => {
    expect(css).toMatch(/\.btn \{[\s\S]*?height: 2\.75rem;/);
  });

  it("raises .btn-sm to 40px", () => {
    expect(css).toContain(".btn-sm { height: 2.5rem;");
    expect(css).not.toContain(".btn-sm { height: 2.25rem;");
  });
});

describe("marketing keeps its own button heights", () => {
  it.each([
    "../marketing/FaqList.tsx",
    "../marketing/DemoLoop.tsx",
    "../marketing/kalk/KalkNav.tsx",
  ])("%s pins btn-sm so the landing is unaffected", (rel) => {
    const src = read(rel);
    for (const line of src.split("\n")) {
      if (!line.includes("btn-sm")) continue;
      expect(line).toMatch(/h-\d+!/);
    }
  });
});

describe("dashboard 'Sammenhængene' cards", () => {
  const src = read("../dashboard/ConnectDotsStream.tsx");

  it("gives the card CTA the full 44px .btn", () => {
    expect(src).toContain('className="btn btn-primary"');
    expect(src).not.toContain('className="btn btn-sm btn-primary"');
  });

  it("raises the more-about chip and the dismiss/snooze row to 44px", () => {
    // more-about chip + Skjul + I morgen
    expect(src.match(/min-h-11/g) ?? []).toHaveLength(3);
    // the footer no longer pads a 15px-tall button row
    expect(src).not.toContain('className="px-5 py-2 border-t hairline');
  });
});

describe("section header 'see all' links", () => {
  const src = read("./SectionHeader.tsx");

  it("extends the 17px text link to a 45px hit area without moving it", () => {
    expect(src).toContain("relative shrink-0");
    expect(src).toContain("after:absolute after:inset-x-0 after:-inset-y-3.5");
  });
});

describe("/train/exercises category chips", () => {
  const src = read("../../app/(app)/train/exercises/page.tsx");

  it("keeps the ?category= link pattern and raises the chips to 44px", () => {
    expect(src).toContain("?category=");
    expect(src).toContain("inline-flex min-h-11 items-center px-4");
    expect(src).not.toContain("px-3 py-1.5 rounded-full");
  });
});

describe("crew feed reaction row", () => {
  const src = read("../community/PostCard.tsx");

  it("raises reps / comments / share to 44px", () => {
    expect(src.match(/min-h-11/g) ?? []).toHaveLength(3);
    expect(src).not.toContain("px-3 py-1.5 rounded-md");
  });
});

describe("live session top bar", () => {
  const src = read("../../app/(app)/session/[id]/SessionClient.tsx");

  it("raises the exit button (and its spacer) to 44px inside the h-14 bar", () => {
    expect(src).toContain('className="size-11 rounded-full surface-2');
    expect(src).toContain('<div className="size-11" aria-hidden />');
  });
});
