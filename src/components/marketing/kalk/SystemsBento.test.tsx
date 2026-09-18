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

  it("giver de tre lyse celler et klip og lader den mørke være", () => {
    // Scoped to the bento grid: the rack below it already carries one
    // video of its own (the form-check screen), which is not this cell.
    expect((bento.match(/<video/g) ?? []).length).toBe(3);
    const heart = bento.slice(bento.indexOf('data-theme="nat"'));
    expect(heart.slice(0, 400)).not.toMatch(/<video/);
  });

  it("renders the rack with five screens", () => {
    const rack = html.slice(html.indexOf("data-rack"));
    expect(rack).toMatch(/<ul[^>]*tabindex="0"/);
    expect(rack).toMatch(new RegExp(`<ul[^>]*aria-label="${k.systems.rack.listLabel}"`));
    expect(rack.match(/<li[\s>]/g)).toHaveLength(5);
    const s = k.screens;
    for (const label of [s.session.aria, s.hrv.aria, s.food.aria, s.mind.aria, s.formCheck.aria]) {
      expect(rack).toContain(`aria-label="${label}"`);
    }
  });
});
