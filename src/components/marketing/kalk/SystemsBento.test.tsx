import { describe, expect, it } from "vitest";
import { render } from "../test-render";
import da from "../../../../messages/da/index";
import SystemsBento from "./SystemsBento";

const html = render(<SystemsBento />);
const k = da.Marketing.kalk;

/** The bento markup only, without the rack below it. */
const bento = html.slice(html.indexOf("data-bento"), html.indexOf("data-rack"));
const cells = bento.match(/<article[^>]*>/g) ?? [];

describe("SystemsBento", () => {
  it("is the systems section", () => {
    expect(html).toMatch(/<section[^>]*id="systems"/);
    expect(html).toContain(k.systems.heading);
  });

  it("has exactly four cells", () => {
    expect(cells).toHaveLength(4);
  });

  it("makes the heart cell a plain Nat block", () => {
    const heart = cells.filter((c) => c.includes('data-theme="nat"'));
    expect(heart).toHaveLength(1);
    expect(heart[0]).toContain('data-cell="heart"');
    expect(html).not.toContain("theme-root");
  });

  it("gives every cell a domain kicker", () => {
    for (const domain of ["body", "food", "heart", "mind"] as const) {
      const cell = bento.split(`data-cell="${domain}"`)[1] ?? "";
      expect(cell).toMatch(new RegExp(`<p[^>]*data-domain="${domain}"[^>]*>(<i[^>]*></i>)?${k.systems[domain].kicker}`));
    }
  });

  it("carries the visual variations from the reference", () => {
    expect(bento).toContain(`aria-label="${k.systems.body.stat} ${k.systems.body.statLabel}"`);
    expect(bento).toContain("data-kg-ticks");
    expect(bento).toContain("data-hrv-bars");
    expect(bento).toContain(k.systems.heart.disclaimer);
  });

  it("uses no hardcoded colours", () => {
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });

  it("giver kun krop-cellen et klip: mad og sind er uden filler-video", () => {
    // Scoped to the bento grid: the rack below it already carries one
    // video of its own (the form-check screen), which is not this cell.
    expect((bento.match(/<video/g) ?? []).length).toBe(1);
    const heart = bento.split('data-cell="heart"')[1]?.split('data-cell="mind"')[0] ?? "";
    expect(heart).not.toMatch(/<video/);
  });

  it("renders the rack with fifteen scrollable screens", () => {
    const rack = html.slice(html.indexOf("data-rack"));
    expect(rack).toMatch(/<ul[^>]*tabindex="0"/);
    expect(rack).toMatch(new RegExp(`<ul[^>]*aria-label="${k.systems.rack.listLabel}"`));
    expect(rack.match(/<li[\s>]/g)).toHaveLength(15);
    expect(rack.match(/data-phone-scroll/g)).toHaveLength(15);
    expect(rack).toContain("01 / 15");
    const s = k.screens;
    for (const label of [
      s.dashboard.aria, s.sleep.aria, s.hrv.aria, s.decision.aria, s.session.aria,
      s.formCheck.aria, s.coach.aria, s.progress.aria, s.block.aria, s.food.aria,
      s.shopping.aria, s.mind.aria, s.breath.aria, s.mindChecked.aria, s.crew.aria,
    ]) {
      expect(rack).toContain(`aria-label="${label.replaceAll("'", "&#x27;")}"`);
    }
  });
});
