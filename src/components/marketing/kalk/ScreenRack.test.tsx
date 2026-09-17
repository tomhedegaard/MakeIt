import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ScreenRack, { rackDirection, rackBehavior } from "./ScreenRack";

const html = renderToStaticMarkup(
  <ScreenRack
    id="rack-test"
    listLabel="Fem app-skærme"
    prevLabel="Forrige skærm"
    nextLabel="Næste skærm"
    items={["a", "b", "c", "d", "e"].map((key) => ({ key, node: <span>{key}</span> }))}
  />,
);

describe("ScreenRack", () => {
  it("is a focusable, labelled list of five items", () => {
    expect(html).toMatch(/<ul[^>]*id="rack-test"[^>]*tabindex="0"[^>]*aria-label="Fem app-skærme"/);
    expect(html.match(/<li[\s>]/g)).toHaveLength(5);
  });

  it("has two labelled buttons that control the list", () => {
    const buttons = html.match(/<button[^>]*>/g) ?? [];
    expect(buttons).toHaveLength(2);
    for (const b of buttons) expect(b).toContain('aria-controls="rack-test"');
    expect(buttons[0]).toContain('aria-label="Forrige skærm"');
    expect(buttons[1]).toContain('aria-label="Næste skærm"');
  });

  it("starts at the first screen, so back is disabled", () => {
    const [prev, next] = html.match(/<button[^>]*>/g) ?? [];
    expect(prev).toMatch(/\sdisabled=""/);
    expect(next).not.toMatch(/\sdisabled=""/);
  });

  it("snaps and uses no scroll listener", async () => {
    expect(html).toContain("snap-x");
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("./ScreenRack.tsx", import.meta.url), "utf8");
    expect(src).not.toMatch(/addEventListener\(\s*["']scroll/);
    expect(src).not.toMatch(/onScroll/);
    expect(src).toContain("IntersectionObserver");
  });

  it("maps arrow keys to one step", () => {
    expect(rackDirection("ArrowRight")).toBe(1);
    expect(rackDirection("ArrowLeft")).toBe(-1);
    expect(rackDirection("ArrowDown")).toBeNull();
  });

  it("jumps instead of gliding under reduced motion", () => {
    expect(rackBehavior(true)).toBe("auto");
    expect(rackBehavior(false)).toBe("smooth");
  });
});
