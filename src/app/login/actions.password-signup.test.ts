import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SRC = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");

describe("passwordAction signup wiring", () => {
  it("routes post-signUp through finishInvitePasswordSignup, never sent=1", () => {
    expect(SRC).toContain("finishInvitePasswordSignup");
    expect(SRC).toContain("confirmAuthUserEmail");

    const sentLine = SRC.split("\n").find((line) => line.includes("sent=1"));
    expect(sentLine).toBeDefined();
    expect(sentLine).toContain("redirect(`/login?sent=1&email=");
    // The only sent=1 redirect is magicLinkAction — password branch
    // must not reuse the inbox wall after invite-validated signUp.
    expect(SRC.indexOf("export async function magicLinkAction")).toBeLessThan(
      SRC.indexOf("sent=1"),
    );
    expect(SRC.indexOf("sent=1")).toBeLessThan(
      SRC.indexOf("export async function passwordAction"),
    );
  });
});
