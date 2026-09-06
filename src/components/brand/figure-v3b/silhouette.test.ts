/**
 * v3B silhouette is a custom editorial path — not the library
 * highlighter outline. Gut / organ Y bounds stay locked in
 * MakeItFigure.test.ts.
 */

import { describe, expect, it } from "vitest";
import { OUTLINES } from "@/lib/data/anatomy/paths";
import { V3B_HEAD, V3B_OUTLINE, V3B_VIEWBOX } from "./silhouette";

describe("figure-v3b silhouette", () => {
  it("is a custom path on the drop-in viewBox — not OUTLINES.male.front", () => {
    expect(V3B_VIEWBOX).toBe("0 0 724 1448");
    expect(V3B_OUTLINE.startsWith("M362")).toBe(true);
    expect(V3B_OUTLINE).toContain("Z");
    expect(V3B_OUTLINE).not.toBe(OUTLINES.male.front);
    expect(V3B_OUTLINE.slice(0, 24)).not.toBe(OUTLINES.male.front.slice(0, 24));
    expect(V3B_HEAD.startsWith("M362")).toBe(true);
  });
});
