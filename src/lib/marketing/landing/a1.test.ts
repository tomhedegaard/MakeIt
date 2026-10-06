import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { A1_SEQUENCE } from "./a1";
import { frameUrl } from "./scroll-sequence";

const pub = (path: string) => new URL(`../../../../public${path}`, import.meta.url);

describe("A1 sequence gate", () => {
  it("only points at frames that exist", () => {
    if (A1_SEQUENCE === null) return;
    expect(existsSync(pub(A1_SEQUENCE.poster.src))).toBe(true);
    for (let i = 0; i < A1_SEQUENCE.frameCount; i++) {
      expect(existsSync(pub(frameUrl(A1_SEQUENCE.base, i)))).toBe(true);
    }
  });
});
