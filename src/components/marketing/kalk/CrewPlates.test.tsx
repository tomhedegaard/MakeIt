import { describe, expect, it } from "vitest";
import { render } from "../test-render";
import da from "../../../../messages/da/index";
import { TIERS, progressToNext } from "@/lib/marketing/tiers";
import CrewPlates from "./CrewPlates";
import { nextTabIndex } from "./TierLadder";

const html = render(<CrewPlates />);
const c = da.Marketing.kalk.crew;

/** Markup of one tier column, up to the next one. */
function tierBlock(key: string) {
  const start = html.indexOf(`data-tier="${key}"`);
  const next = html.indexOf("data-tier=", start + 1);
  return html.slice(start, next === -1 ? undefined : next);
}

describe("CrewPlates", () => {
  it("is the crew section and keeps the tiers anchor", () => {
    expect(html).toMatch(/<section[^>]*id="crew"/);
    expect(html).toContain('id="tiers"');
  });

  it("carries eyebrow 2 of 3", () => {
    expect(html.match(/class="eyebrow/g)).toHaveLength(1);
    expect(html).toContain(c.eyebrow);
  });

  it("draws one plate per tier", () => {
    expect(html.match(/data-plate="/g)).toHaveLength(4);
    for (const tier of TIERS) {
      expect(html).toContain(`data-plate="${tier.key}"`);
      expect(tierBlock(tier.key)).toContain(tier.name);
    }
  });

  it("marks Athlete as here and Beast as Coach School", () => {
    expect(tierBlock("athlete")).toContain(c.here);
    expect(tierBlock("beast")).toContain(c.coachSchool);
    expect(html.split(c.here)).toHaveLength(2);
    expect(html).toMatch(/data-plate="athlete"[^>]*data-current="true"/);
  });

  it("fills the reps meter from the shared ladder", () => {
    const progress = progressToNext(1240);
    expect(progress).not.toBeNull();
    const meter = html.match(/<div[^>]*role="img"[^>]*>/)?.[0] ?? "";
    expect(meter).toMatch(/aria-label="[^"]*1\.240[^"]*"/);
    expect(html).toContain(`width:${progress!.ratio * 100}%`);
  });

  it("lists how reps are earned and uses no hardcoded colours", () => {
    for (const label of Object.values(c.earn)) expect(html).toContain(label.replace("'", "&#x27;"));
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });

  it("makes the four tiers a tablist that opens on the member's own tier", () => {
    expect(html).toMatch(new RegExp(`role="tablist"[^>]*aria-label="${c.ladder.listLabel}"`));
    expect(html.match(/role="tab"/g)).toHaveLength(4);
    expect(html).toMatch(/aria-selected="true"[^>]*data-tier="athlete"/);
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html).toMatch(/data-plate="athlete"[^>]*data-selected="true"/);
  });

  it("shows what the chosen tier unlocks, taken from the app's Reps page", () => {
    const panel = html.slice(html.indexOf('role="tabpanel"'));
    expect(panel).toContain('data-tier-panel="athlete"');
    for (const perk of da.Reps.tiers.list.Athlete.perks) expect(panel).toContain(perk);
    expect(panel).toContain("1.000+ reps");
  });

  it("ends in a call to action to the waitlist, named for the tier", () => {
    const panel = html.slice(html.indexOf('role="tabpanel"'));
    expect(panel).toMatch(/<a[^>]*href="\/#waitlist"[^>]*>Start mod Athlete/);
    expect(panel).toContain(c.ladder.ctaNote);
  });
});

describe("nextTabIndex", () => {
  it("wraps with the arrow keys and jumps with Home and End", () => {
    expect(nextTabIndex("ArrowRight", 3, 4)).toBe(0);
    expect(nextTabIndex("ArrowLeft", 0, 4)).toBe(3);
    expect(nextTabIndex("ArrowDown", 1, 4)).toBe(2);
    expect(nextTabIndex("Home", 2, 4)).toBe(0);
    expect(nextTabIndex("End", 0, 4)).toBe(3);
    expect(nextTabIndex("Enter", 1, 4)).toBeNull();
  });
});
