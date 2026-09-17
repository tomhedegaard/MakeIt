import { describe, expect, it } from "vitest";
import { getLandingVariant } from "./landing-variant";

describe("getLandingVariant", () => {
  it("defaults to the classic landing", () => {
    expect(getLandingVariant({})).toBe("classic");
    expect(getLandingVariant({ LANDING_VARIANT: "" })).toBe("classic");
  });

  it("switches to Kalk only on the exact value", () => {
    expect(getLandingVariant({ LANDING_VARIANT: "kalk" })).toBe("kalk");
    expect(getLandingVariant({ LANDING_VARIANT: " KALK " })).toBe("kalk");
    expect(getLandingVariant({ LANDING_VARIANT: "kalkx" })).toBe("classic");
  });
});
