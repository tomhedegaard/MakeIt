import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SRC = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");
const CALLBACK = readFileSync(
  new URL("../auth/callback/route.ts", import.meta.url),
  "utf8",
);

describe("magicLinkAction wiring", () => {
  it("routes send through decideMagicLinkSend and shouldCreateUser", () => {
    expect(SRC).toContain("decideMagicLinkSend");
    expect(SRC).toContain("classifyMagicLinkOtpError");
    expect(SRC).toContain("shouldCreateUser: createUser");
    expect(SRC).toContain('redirect("/login?err=need_invite")');
    expect(SRC).toContain("jar.delete(PENDING_INVITE_COOKIE)");
  });

  it("does not require an invite before sending a returning OTP", () => {
    const start = SRC.indexOf("export async function magicLinkAction");
    const end = SRC.indexOf("export async function passwordAction");
    const body = SRC.slice(start, end);
    expect(body).not.toMatch(/if \(!email \|\| !code\)/);
    expect(body).toContain("send-signup");
    expect(body).toContain("shouldCreateUser: createUser");
    expect(body).toContain("jar.delete(PENDING_INVITE_COOKIE)");
  });
});

describe("auth callback wiring", () => {
  it("finishes through finishMagicLinkCallback (returning + consume)", () => {
    expect(CALLBACK).toContain("finishMagicLinkCallback");
    expect(CALLBACK).toContain("fetchInviteAdmitted");
    expect(CALLBACK).not.toContain("decideInviteConsume");
  });
});
