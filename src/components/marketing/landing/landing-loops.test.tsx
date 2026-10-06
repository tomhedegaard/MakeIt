import { describe, expect, it } from "vitest";
import { render } from "../test-render";
import LandingPage from "./LandingPage";

describe("Kalk landing loops", () => {
  it("never plays the same exercise loop twice", () => {
    // The app rack renders twice: a swipe rack and a pinned phone. CSS
    // shows exactly one of them, so count the loops of the swipe rack only.
    const html = render(<LandingPage />).replace(/<div data-rack-pin[\s\S]*?<\/section>/, "</section>");
    const loops = [...html.matchAll(/<source src="([^"]+)\.webm"/g)].map((m) => m[1]);
    expect(loops.length).toBeGreaterThanOrEqual(3);
    expect(new Set(loops).size).toBe(loops.length);
  });
});
