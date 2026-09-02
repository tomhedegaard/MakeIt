/**
 * Dashboard BodyMap inherits MakeItFigure. Lock the compact sizes so
 * the v2 organ/halo upgrade does not regress the Today header.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("BodyMap", () => {
  it("keeps the compact dashboard figure sizes", () => {
    const src = readFileSync(new URL("./BodyMap.tsx", import.meta.url), "utf8");
    expect(src).toContain('className="h-36 md:h-48 w-auto shrink-0"');
    expect(src).toContain("highlightedDomains={DOMAINS}");
  });
});
