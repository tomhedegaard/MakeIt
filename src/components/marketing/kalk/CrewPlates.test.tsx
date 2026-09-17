import { describe, expect, it } from "vitest";
import { render } from "../test-render";
import da from "../../../../messages/da/index";
import { TIERS, progressToNext } from "@/lib/marketing/tiers";
import CrewPlates from "./CrewPlates";

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
});
