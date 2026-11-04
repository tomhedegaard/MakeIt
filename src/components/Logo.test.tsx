import { describe, expect, it } from "vitest";
import { render } from "./marketing/test-render";
import Logo from "./Logo";
import { ReadyMark, UpMark } from "./brand/MakeItMark";

describe("Logo (docs/BRAND_MARK.md)", () => {
  it("signs the product name with the MakeIt A in front, in currentColor", () => {
    const html = render(<Logo />);
    expect(html).toMatch(/<svg[^>]*fill="currentColor"[^>]*aria-hidden="true"[\s\S]*MakeIt[\s\S]*HQ/);
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("lets HQ introduce itself with MakeIt as the sender", () => {
    const html = render(<Logo variant="sender" />);
    expect(html).toMatch(/>HQ<\/span>/);
    expect(html).toMatch(/by\s*<svg[\s\S]*MakeIt/);
  });

  it("stands alone as a mark", () => {
    expect(render(<Logo variant="mark" />)).toMatch(/^<svg[\s\S]*<\/svg>$/);
  });
});

describe("the A as data", () => {
  it("reads lav, midt and ro as three different shapes with the word as its name", () => {
    const one = render(<ReadyMark level={1} label="Lav" />);
    const two = render(<ReadyMark level={2} label="Midt" />);
    const three = render(<ReadyMark level={3} label="Ro" />);
    expect(one).toContain('fill-opacity="0.18"');
    expect(two).toContain('fill="none"');
    expect(three).not.toMatch(/fill-opacity|fill="none"/);
    for (const html of [one, two, three]) expect(html).toMatch(/role="img" aria-label="(Lav|Midt|Ro)"/);
  });

  it("points up with the outer chevron only", () => {
    expect(render(<UpMark />).match(/<path /g)).toHaveLength(1);
  });
});
