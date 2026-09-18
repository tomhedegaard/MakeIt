import { describe, expect, it } from "vitest";
import { render } from "../test-render";
import NightCurve from "./NightCurve";

describe("NightCurve", () => {
  it("tegner tre aflæsninger og bruger tokens", () => {
    const html = render(<NightCurve />);
    expect((html.match(/<circle/g) ?? []).length).toBe(3);
    expect(html).not.toMatch(/#[0-9a-f]{6}/i);
  });
});
