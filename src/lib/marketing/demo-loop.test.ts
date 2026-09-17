import { describe, expect, it } from "vitest";
import { shouldPlay } from "./demo-loop";

describe("shouldPlay", () => {
  const base = { inView: true, reducedMotion: false, userPaused: false, ready: true };
  it("plays only when visible, ready, not paused and motion allowed", () => {
    expect(shouldPlay(base)).toBe(true);
    expect(shouldPlay({ ...base, inView: false })).toBe(false);
    expect(shouldPlay({ ...base, reducedMotion: true })).toBe(false);
    expect(shouldPlay({ ...base, userPaused: true })).toBe(false);
    expect(shouldPlay({ ...base, ready: false })).toBe(false);
  });
});
