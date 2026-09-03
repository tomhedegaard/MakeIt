import { describe, expect, it } from "vitest";
import { ensureMemberStarter } from "./seed-member";

describe("ensureMemberStarter", () => {
  it("is a no-op — does not invent a week-4 program for new members", async () => {
    await expect(ensureMemberStarter("any-member")).resolves.toBeUndefined();
  });
});
