import { describe, expect, it } from "vitest";
import {
  elementIsInViewport,
  observerOptions,
  planReveal,
  prefersReducedMotion,
  resolveHashId,
} from "./reveal";

function fakeEl(id?: string): HTMLElement {
  const el = {
    id: id ?? "",
    classList: { add() {}, remove() {}, contains() { return false; } },
    hasAttribute: (name: string) => name === "data-reveal",
    closest: (sel: string) => (id && sel === `#${id}` ? el : null),
    querySelectorAll: () => [],
  };
  return el as unknown as HTMLElement;
}

describe("reveal progressive enhancement", () => {
  it("treats content already in the viewport as visible", () => {
    expect(elementIsInViewport({ top: 40, bottom: 200 }, 800)).toBe(true);
    expect(elementIsInViewport({ top: 900, bottom: 1100 }, 800)).toBe(false);
    expect(elementIsInViewport({ top: -20, bottom: 40 }, 800)).toBe(true);
  });

  it("keeps a slack so a fast scroll still counts as in view", () => {
    expect(elementIsInViewport({ top: 820, bottom: 980 }, 800, 80)).toBe(true);
  });

  it("parses hash ids and ignores empty hashes", () => {
    expect(resolveHashId("#waitlist")).toBe("waitlist");
    expect(resolveHashId("#")).toBeNull();
    expect(resolveHashId("")).toBeNull();
  });

  it("never hides nodes when motion is reduced or observer is missing", () => {
    const a = fakeEl("crew");
    const b = fakeEl();
    const plan = planReveal({
      root: { querySelectorAll: () => [a, b] } as unknown as ParentNode,
      viewportHeight: 800,
      hash: "",
      reducedMotion: true,
      hasIntersectionObserver: true,
      measure: () => ({ top: 2000, bottom: 2200 }),
    });
    expect(plan.showNow).toEqual([a, b]);
    expect(plan.mayAnimate).toEqual([]);

    const noIo = planReveal({
      root: { querySelectorAll: () => [a] } as unknown as ParentNode,
      viewportHeight: 800,
      hash: "",
      reducedMotion: false,
      hasIntersectionObserver: false,
      measure: () => ({ top: 2000, bottom: 2200 }),
    });
    expect(noIo.showNow).toEqual([a]);
    expect(noIo.mayAnimate).toEqual([]);
  });

  it("shows the hash target even when it is below the fold", () => {
    const target = fakeEl("waitlist");
    const other = fakeEl();
    const plan = planReveal({
      root: { querySelectorAll: () => [target, other] } as unknown as ParentNode,
      viewportHeight: 800,
      hash: "#waitlist",
      reducedMotion: false,
      hasIntersectionObserver: true,
      measure: () => ({ top: 2400, bottom: 2800 }),
    });
    expect(plan.showNow).toContain(target);
    expect(plan.mayAnimate).toContain(other);
    expect(plan.mayAnimate).not.toContain(target);
  });

  it("uses a zero threshold and a generous root margin", () => {
    const opts = observerOptions();
    expect(opts.threshold).toBe(0);
    expect(opts.rootMargin).toMatch(/20%/);
  });

  it("reads prefers-reduced-motion from matchMedia", () => {
    expect(
      prefersReducedMotion({
        matchMedia: () => ({ matches: true }) as MediaQueryList,
      }),
    ).toBe(true);
    expect(
      prefersReducedMotion({
        matchMedia: () => ({ matches: false }) as MediaQueryList,
      }),
    ).toBe(false);
    expect(prefersReducedMotion(null)).toBe(false);
  });
});
