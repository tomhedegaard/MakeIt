import { describe, expect, it } from "vitest";
import da from "../../../../messages/da/index";
import { DEVICE_SOON } from "./devices";

describe("HRV devices", () => {
  it("has one flag per listed device", () => {
    expect(DEVICE_SOON).toHaveLength((da.Marketing.landing.chapters.heart.devices as string[]).length);
  });
});
