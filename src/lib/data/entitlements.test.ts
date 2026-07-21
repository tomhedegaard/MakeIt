import { describe, expect, it } from "vitest";
import { deriveEntitlements } from "./entitlements";

const NONE = { train: false, nutrition: false, hrv: false, mind: false };
const ALL = { train: true, nutrition: true, hrv: true, mind: true };

describe("deriveEntitlements", () => {
  it("ingen abonnementer → intet låst op", () => {
    expect(deriveEntitlements([])).toEqual(NONE);
  });

  it("enkeltmodul → kun det modul", () => {
    expect(deriveEntitlements([{ product_kind: "train" }])).toEqual({
      ...NONE,
      train: true,
    });
  });

  it("flere enkeltmoduler → summen", () => {
    expect(
      deriveEntitlements([{ product_kind: "train" }, { product_kind: "hrv" }])
    ).toEqual({ ...NONE, train: true, hrv: true });
  });

  it("crew-bundle → alt låst op", () => {
    expect(deriveEntitlements([{ product_kind: "crew" }])).toEqual(ALL);
  });

  it("crew vinder over delvise moduler", () => {
    expect(
      deriveEntitlements([{ product_kind: "train" }, { product_kind: "crew" }])
    ).toEqual(ALL);
  });

  it("one_on_one alene låser ingen indholds-moduler op", () => {
    expect(deriveEntitlements([{ product_kind: "one_on_one" }])).toEqual(NONE);
  });

  it("ukendt product_kind ignoreres", () => {
    expect(deriveEntitlements([{ product_kind: "mystery" }])).toEqual(NONE);
  });
});
