import { describe, expect, it } from "vitest";
import { render } from "../test-render";
import NightStage from "./NightStage";

const html = render(<NightStage />);

describe("NightStage", () => {
  it("is a local nat block with the night's label and sample note", () => {
    expect(html).toMatch(/<div data-night[^>]*data-theme="nat"/);
    expect(html).toContain("I nat · 23:40 → 06:45");
    expect(html).toContain("Eksempeldata");
  });

  it("draws the curve once, with pathLength 1 so CSS can scrub it", () => {
    expect(html.match(/<path /g)).toHaveLength(1);
    expect(html).toMatch(/<path[^>]*pathLength="1"[^>]*class="night-path/);
  });

  it("lands the three readings in their domains at their place in the night", () => {
    for (const [key, domain, at] of [["sleep", "mind", "0.06"], ["hrv", "heart", "0.66"], ["stress", "mind", "0.84"]]) {
      expect(html, key).toMatch(new RegExp(`<li data-domain="${domain}" style="--at:${at}"`));
    }
    expect(html).toContain("5 t 12 m");
    expect(html).toContain("48<small");
    expect(html).toContain("4<small");
  });

  it("keeps the clock out of the accessibility tree; the label carries the times", () => {
    expect(html).toMatch(/<p aria-hidden="true" class="night-clock/);
  });
});
