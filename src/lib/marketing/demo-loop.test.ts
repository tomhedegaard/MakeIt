import { describe, expect, it } from "vitest";
import { shouldPlay } from "./demo-loop";

describe("shouldPlay", () => {
  const base = {
    inView: true,
    reducedMotion: false,
    userPaused: false,
    ready: true,
    userRequested: false,
  };

  it("plays only when visible, ready, not paused and motion allowed", () => {
    expect(shouldPlay(base)).toBe(true);
    expect(shouldPlay({ ...base, inView: false })).toBe(false);
    expect(shouldPlay({ ...base, reducedMotion: true })).toBe(false);
    expect(shouldPlay({ ...base, userPaused: true })).toBe(false);
    expect(shouldPlay({ ...base, ready: false })).toBe(false);
  });

  it("autoplayer aldrig af sig selv med reduceret bevægelse", () => {
    expect(shouldPlay({ ...base, reducedMotion: true, userRequested: false })).toBe(false);
  });

  it("lader et bevidst tryk vinde over reduceret bevægelse", () => {
    expect(shouldPlay({ ...base, reducedMotion: true, userRequested: true })).toBe(true);
  });

  it("afspiller ikke et ønsket klip uden for skærmen", () => {
    expect(shouldPlay({ ...base, reducedMotion: true, userRequested: true, inView: false })).toBe(
      false,
    );
    expect(shouldPlay({ ...base, userRequested: true, inView: false })).toBe(false);
  });

  it("afspiller ikke et ønsket klip før videoen kan spille", () => {
    expect(shouldPlay({ ...base, reducedMotion: true, userRequested: true, ready: false })).toBe(
      false,
    );
    expect(shouldPlay({ ...base, userRequested: true, ready: false })).toBe(false);
  });

  it("et tryk på pause vinder stadig over et tidligere ønske", () => {
    expect(shouldPlay({ ...base, userRequested: true, userPaused: true })).toBe(false);
  });

  it("er uændret for kaldere uden flaget", () => {
    const withoutFlag = { inView: true, reducedMotion: false, userPaused: false, ready: true };
    expect(shouldPlay(withoutFlag)).toBe(true);
    expect(shouldPlay({ ...withoutFlag, reducedMotion: true })).toBe(false);
  });
});
