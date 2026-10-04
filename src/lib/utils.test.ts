import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn keeps the Nord type scale", () => {
  it("keeps a size token next to a colour token", () => {
    expect(cn("text-micro text-fg-dim")).toBe("text-micro text-fg-dim");
    expect(cn("text-hero-lg", "text-fg")).toBe("text-hero-lg text-fg");
  });

  it("still lets a later size win over an earlier one", () => {
    expect(cn("text-micro", "text-card")).toBe("text-card");
    expect(cn("text-sm", "text-copy")).toBe("text-copy");
  });
});
