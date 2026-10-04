import { describe, it, expect } from "vitest";
import { onlySharing } from "./hrv-share";

describe("onlySharing", () => {
  it("keeps only rows whose member shares", () => {
    const rows = [{ memberId: "a" }, { memberId: "b" }, { memberId: "a" }];
    expect(onlySharing(rows, new Set(["a"]))).toEqual([
      { memberId: "a" },
      { memberId: "a" },
    ]);
  });

  it("drops everything when nobody shares (default after 0068)", () => {
    expect(onlySharing([{ memberId: "a" }], new Set())).toEqual([]);
  });
});
