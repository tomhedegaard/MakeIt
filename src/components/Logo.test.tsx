import { describe, expect, it } from "vitest";
import { render } from "./marketing/test-render";
import Logo from "./Logo";
import { MakeItWordmark, ReadyMark, UpMark } from "./brand/MakeItMark";

describe("Logo (docs/BRAND_MARK.md)", () => {
  it("names the product HQ and lets MakeIt sign it with the wordmark, in currentColor", () => {
    const html = render(<Logo />);
    expect(html).toMatch(/>HQ<\/span>[\s\S]*by[\s\S]*<svg[^>]*fill="currentColor"[^>]*role="img"[^>]*aria-label="MakeIt"/);
    expect(html).not.toContain("//");
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("stacks the same words where HQ introduces itself", () => {
    const html = render(<Logo variant="sender" />);
    expect(html).toMatch(/flex-col[\s\S]*text-title[^>]*>HQ<\/span>[\s\S]*by[\s\S]*aria-label="MakeIt"/);
  });

  it("keeps IT quieter than MAKE, as in the wordmark file", () => {
    const paths = render(<MakeItWordmark />).match(/<path [^>]*>/g) ?? [];
    expect(paths).toHaveLength(2);
    expect(paths[0]).not.toContain("fill-opacity");
    expect(paths[1]).toContain('fill-opacity="0.6"');
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
