import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const footer = readFileSync(new URL("./Footer.tsx", import.meta.url), "utf8");
const nav = readFileSync(new URL("./MarketingNav.tsx", import.meta.url), "utf8");
const playground = readFileSync(
  new URL("./AdaptivePlaygroundPublic.tsx", import.meta.url),
  "utf8",
);
const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
const hero = readFileSync(new URL("./Hero.tsx", import.meta.url), "utf8");

describe("marketing public anchors", () => {
  it("points footer universe links at real landing ids", () => {
    expect(footer).not.toMatch(/href="#coaching"/);
    expect(footer).not.toMatch(/href="#community"/);
    expect(footer).not.toMatch(/href="#reps"/);
    expect(footer).toMatch(/href="#pillar-munk-multiplier"/);
    expect(footer).toMatch(/href="#tiers"/);
    expect(footer).toMatch(/href="#crew"/);
  });

  it("points nav Coaching at the coaching pillar, not the engine playground", () => {
    expect(nav).toMatch(/href: "#pillar-munk-multiplier",\s*key: "coaching"/);
    expect(nav).toMatch(/href: "#engine"/);
  });

  it("does not bait-and-switch the engine CTA onto an authed explainer", () => {
    expect(playground).not.toMatch(/href="\/hrv\/learn\/adaptive"/);
    expect(playground).toMatch(/href="\/login\?next=\/hrv\/learn\/adaptive"/);
    expect(playground).toMatch(/ctaMembersOnly/);
  });
});

describe("reveal fail-open", () => {
  it("does not hide [data-reveal] until JS opts in", () => {
    expect(css).toMatch(/html\.reveal-js \[data-reveal\]:not\(\.is-visible\)/);
    expect(css).not.toMatch(/\/\* Reveal-on-scroll \*\/\s*\[data-reveal\] \{\s*opacity: 0;/);
  });

  it("renders hero primary copy without a hidden Framer initial state", () => {
    expect(hero).toContain("<HeroCopy />");
    expect(hero).not.toMatch(/initial=\{\{ opacity: 0/);
    expect(hero).not.toMatch(/hidden: \{ y: "110%", opacity: 0/);
  });
});
