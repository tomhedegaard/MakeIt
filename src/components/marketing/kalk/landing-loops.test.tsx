import { describe, expect, it } from "vitest";
import { render } from "../test-render";
import KalkLanding from "./KalkLanding";

describe("Kalk landing loops", () => {
  it("never plays the same exercise loop twice", () => {
    const html = render(<KalkLanding />);
    const loops = [...html.matchAll(/<source src="([^"]+)\.webm"/g)].map((m) => m[1]);
    expect(loops.length).toBeGreaterThanOrEqual(3);
    expect(new Set(loops).size).toBe(loops.length);
  });
});
