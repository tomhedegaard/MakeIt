import { describe, expect, it } from "vitest";
import {
  GuardianInviteSchema,
  YouthAcceptSchema,
  ageOn,
  effectiveConsent,
  eighteenthBirthday,
  hashInviteToken,
  inviteExpiry,
  isYouthAge,
  newInviteToken,
} from "./rules";

const today = new Date("2026-09-27T12:00:00Z");

describe("age", () => {
  it("counts whole years and respects the birthday", () => {
    expect(ageOn("2011-09-27", today)).toBe(15);
    expect(ageOn("2011-09-28", today)).toBe(14);
    expect(ageOn("2008-09-28", today)).toBe(17);
    expect(ageOn("2008-09-27", today)).toBe(18);
  });

  it("admits 15–17 only (Toms beslutning 1)", () => {
    expect(isYouthAge("2011-09-28", today)).toBe(false);
    expect(isYouthAge("2011-09-27", today)).toBe(true);
    expect(isYouthAge("2008-09-28", today)).toBe(true);
    expect(isYouthAge("2008-09-27", today)).toBe(false);
    expect(isYouthAge("not-a-date", today)).toBe(false);
  });

  it("knows the 18th birthday", () => {
    expect(eighteenthBirthday("2009-03-14")).toBe("2027-03-14");
  });
});

describe("invitation token", () => {
  it("is long, url-safe and stored only as a hash", () => {
    const t = newInviteToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hashInviteToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInviteToken(t)).not.toContain(t);
    expect(newInviteToken()).not.toBe(t);
  });

  it("expires after a week", () => {
    expect(inviteExpiry(today)).toBe("2026-10-04T12:00:00.000Z");
  });
});

describe("forms", () => {
  const guardian = { firstName: "Sara", email: " Sara@Example.dk ", birthDate: "2010-05-01", consentRecovery: true, consentMind: false, declaration: "on" };

  it("requires the guardian's declaration and normalises the e-mail", () => {
    const ok = GuardianInviteSchema.safeParse(guardian);
    expect(ok.success && ok.data.email).toBe("sara@example.dk");
    expect(GuardianInviteSchema.safeParse({ ...guardian, declaration: undefined }).success).toBe(false);
  });

  it("requires the young member's own consent and a real password", () => {
    const base = { token: "x".repeat(43), password: "langtpassword", consentRecovery: true, consentMind: true, consent: "on" };
    expect(YouthAcceptSchema.safeParse(base).success).toBe(true);
    expect(YouthAcceptSchema.safeParse({ ...base, consent: undefined }).success).toBe(false);
    expect(YouthAcceptSchema.safeParse({ ...base, password: "kort" }).success).toBe(false);
  });

  it("turns an area on only when both said yes", () => {
    expect(effectiveConsent(true, true)).toBe(true);
    expect(effectiveConsent(true, false)).toBe(false);
    expect(effectiveConsent(false, true)).toBe(false);
  });
});
