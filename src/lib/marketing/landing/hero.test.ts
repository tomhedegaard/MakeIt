import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HERO_SEQUENCE } from "./hero";
import { frameUrl } from "./scroll-sequence";

const pub = (path: string) => new URL(`../../../../public${path}`, import.meta.url);

describe("hero sequence gate", () => {
  it("only points at frames that exist", () => {
    expect(existsSync(pub(HERO_SEQUENCE.poster.src))).toBe(true);
    for (let i = 0; i < HERO_SEQUENCE.frameCount; i++) {
      expect(existsSync(pub(frameUrl(HERO_SEQUENCE.base, i)))).toBe(true);
    }
  });
});
