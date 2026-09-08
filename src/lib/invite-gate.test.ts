import { describe, expect, it } from "vitest";
import {
  NEW_AUTH_USER_WINDOW_MS,
  admitInviteConsume,
  admitInviteValidation,
  classifyMagicLinkOtpError,
  decideInviteConsume,
  decideMagicLinkSend,
  decidePasswordSignupNext,
  hasMinimumInviteShape,
  isNewlyCreatedAuthUser,
  normalizeInviteCode,
} from "./invite-gate";

const NOW = Date.parse("2026-08-31T12:00:00.000Z");

describe("normalizeInviteCode", () => {
  it("trims and uppercases, matching is_invite_valid SQL", () => {
    expect(normalizeInviteCode("  munk-01  ")).toBe("MUNK-01");
    expect(normalizeInviteCode("makeit-crew")).toBe("MAKEIT-CREW");
  });
});

describe("hasMinimumInviteShape", () => {
  it("rejects codes shorter than 4 after normalise", () => {
    expect(hasMinimumInviteShape("ab")).toBe(false);
    expect(hasMinimumInviteShape("  abc  ")).toBe(false);
    expect(hasMinimumInviteShape("abcd")).toBe(true);
  });

  it("is not a connected-mode admit — dummy 4+ char codes still need the RPC", () => {
    expect(hasMinimumInviteShape("FAKE-CODE")).toBe(true);
    expect(admitInviteValidation(false)).toBe(false);
    expect(admitInviteValidation(null)).toBe(false);
  });
});

describe("admitInviteValidation", () => {
  it("admits only an explicit RPC true (fail closed)", () => {
    expect(admitInviteValidation(true)).toBe(true);
    expect(admitInviteValidation(false)).toBe(false);
    expect(admitInviteValidation(null)).toBe(false);
  });

  it("does not special-case demo codes — MUNK-01 is not valid without RPC true", () => {
    expect(normalizeInviteCode("MUNK-01")).toBe("MUNK-01");
    expect(admitInviteValidation(false)).toBe(false);
    expect(admitInviteValidation(null)).toBe(false);
  });
});

describe("admitInviteConsume", () => {
  it("admits only an explicit consume true (fail closed)", () => {
    expect(admitInviteConsume(true)).toBe(true);
    expect(admitInviteConsume(false)).toBe(false);
    expect(admitInviteConsume(null)).toBe(false);
  });
});

describe("isNewlyCreatedAuthUser", () => {
  it("is true when created_at is inside the window", () => {
    const created = new Date(NOW - 60 * 60 * 1000).toISOString();
    expect(isNewlyCreatedAuthUser(created, NOW)).toBe(true);
  });

  it("is true at the window edge", () => {
    const created = new Date(NOW - NEW_AUTH_USER_WINDOW_MS).toISOString();
    expect(isNewlyCreatedAuthUser(created, NOW)).toBe(true);
  });

  it("is false when created_at is older than the window", () => {
    const created = new Date(NOW - NEW_AUTH_USER_WINDOW_MS - 1).toISOString();
    expect(isNewlyCreatedAuthUser(created, NOW)).toBe(false);
  });

  it("treats missing or unparseable created_at as new (fail closed)", () => {
    expect(isNewlyCreatedAuthUser(null, NOW)).toBe(true);
    expect(isNewlyCreatedAuthUser(undefined, NOW)).toBe(true);
    expect(isNewlyCreatedAuthUser("not-a-date", NOW)).toBe(true);
  });
});

describe("decideInviteConsume", () => {
  it("requires consume for a new user with an invite", () => {
    const created = new Date(NOW - 1000).toISOString();
    expect(
      decideInviteConsume({
        invite: "  makeit-crew  ",
        userCreatedAt: created,
        nowMs: NOW,
      }),
    ).toEqual({ action: "consume", invite: "MAKEIT-CREW" });
  });

  it("rejects a new user with no invite", () => {
    const created = new Date(NOW - 1000).toISOString();
    expect(
      decideInviteConsume({
        invite: null,
        userCreatedAt: created,
        nowMs: NOW,
      }),
    ).toEqual({ action: "reject" });
  });

  it("rejects a new user with a blank invite", () => {
    const created = new Date(NOW - 1000).toISOString();
    expect(
      decideInviteConsume({
        invite: "   ",
        userCreatedAt: created,
        nowMs: NOW,
      }),
    ).toEqual({ action: "reject" });
  });

  it("skips consume for an existing user (do not burn multi-use codes)", () => {
    const created = new Date(NOW - NEW_AUTH_USER_WINDOW_MS - 1).toISOString();
    expect(
      decideInviteConsume({
        invite: "MAKEIT-CREW",
        userCreatedAt: created,
        nowMs: NOW,
      }),
    ).toEqual({ action: "allow" });
    expect(
      decideInviteConsume({
        invite: null,
        userCreatedAt: created,
        nowMs: NOW,
      }),
    ).toEqual({ action: "allow" });
  });

  it("allows an already-admitted user with no invite (confirm after trigger consume)", () => {
    const created = new Date(NOW - 1000).toISOString();
    expect(
      decideInviteConsume({
        invite: null,
        userCreatedAt: created,
        nowMs: NOW,
        alreadyAdmitted: true,
      }),
    ).toEqual({ action: "allow" });
  });

  it("requires consume for an un-admitted user even after the 7-day window", () => {
    const created = new Date(NOW - NEW_AUTH_USER_WINDOW_MS - 1).toISOString();
    expect(
      decideInviteConsume({
        invite: "  makeit-crew  ",
        userCreatedAt: created,
        nowMs: NOW,
        alreadyAdmitted: false,
      }),
    ).toEqual({ action: "consume", invite: "MAKEIT-CREW" });
  });

  it("rejects an un-admitted user with no invite even after the 7-day window", () => {
    const created = new Date(NOW - NEW_AUTH_USER_WINDOW_MS - 1).toISOString();
    expect(
      decideInviteConsume({
        invite: null,
        userCreatedAt: created,
        nowMs: NOW,
        alreadyAdmitted: false,
      }),
    ).toEqual({ action: "reject" });
  });

  it("treats alreadyAdmitted null like the 7-day window (pre-migration)", () => {
    const created = new Date(NOW - NEW_AUTH_USER_WINDOW_MS - 1).toISOString();
    expect(
      decideInviteConsume({
        invite: null,
        userCreatedAt: created,
        nowMs: NOW,
        alreadyAdmitted: null,
      }),
    ).toEqual({ action: "allow" });
  });

  it("allows an official returning magic-link even inside the 7-day window", () => {
    const created = new Date(NOW - 1000).toISOString();
    expect(
      decideInviteConsume({
        invite: null,
        userCreatedAt: created,
        nowMs: NOW,
        alreadyAdmitted: null,
        returningMagicLink: true,
      }),
    ).toEqual({ action: "allow" });
  });

  it("still rejects an un-admitted returning magic-link (0059 probed false)", () => {
    const created = new Date(NOW - 1000).toISOString();
    expect(
      decideInviteConsume({
        invite: null,
        userCreatedAt: created,
        nowMs: NOW,
        alreadyAdmitted: false,
        returningMagicLink: true,
      }),
    ).toEqual({ action: "reject" });
  });
});

describe("decideMagicLinkSend", () => {
  it("sends a returning OTP when email is present and invite is blank", () => {
    expect(
      decideMagicLinkSend({ email: "  Tom@TomTesty.dk  ", invite: null }),
    ).toEqual({ action: "send-returning" });
    expect(
      decideMagicLinkSend({ email: "tom@tomtesty.dk", invite: "   " }),
    ).toEqual({ action: "send-returning" });
  });

  it("treats a shaped invite as signup that still needs the RPC", () => {
    expect(
      decideMagicLinkSend({
        email: "new@example.com",
        invite: "  testy-01  ",
      }),
    ).toEqual({ action: "send-signup", invite: "TESTY-01" });
  });

  it("rejects a missing email even if an invite is present", () => {
    expect(
      decideMagicLinkSend({ email: "   ", invite: "TESTY-01" }),
    ).toEqual({ action: "reject-email" });
  });

  it("rejects a too-short invite instead of treating it as returning", () => {
    expect(
      decideMagicLinkSend({ email: "new@example.com", invite: "ab" }),
    ).toEqual({ action: "reject-invite" });
  });
});

describe("classifyMagicLinkOtpError", () => {
  it("maps signup-disabled on the returning path to need_invite", () => {
    expect(
      classifyMagicLinkOtpError(
        { message: "Signups not allowed for otp", status: 422 },
        false,
      ),
    ).toBe("need_invite");
    expect(
      classifyMagicLinkOtpError({ code: "user_not_found", status: 400 }, false),
    ).toBe("need_invite");
  });

  it("keeps signup-disabled as otp on the invite-signup path", () => {
    expect(
      classifyMagicLinkOtpError(
        { message: "Signups not allowed for otp", status: 422 },
        true,
      ),
    ).toBe("otp");
  });

  it("treats rate-limits as sent so the user checks their inbox", () => {
    expect(
      classifyMagicLinkOtpError(
        { message: "email rate limit exceeded", status: 429 },
        false,
      ),
    ).toBe("sent");
  });

  it("treats a missing error as sent", () => {
    expect(classifyMagicLinkOtpError(null, false)).toBe("sent");
  });
});

describe("decidePasswordSignupNext", () => {
  const userId = "user-new";

  it("admits when signUp already returned a session (confirm off)", () => {
    expect(
      decidePasswordSignupNext({
        user: { id: userId, identities: [{ id: "ident-1" }] },
        session: { access_token: "tok" },
      }),
    ).toEqual({ action: "admit-session", userId });
  });

  it("confirms then signs in when a real user was created without a session", () => {
    expect(
      decidePasswordSignupNext({
        user: { id: userId, identities: [{ id: "ident-1" }] },
        session: null,
      }),
    ).toEqual({ action: "confirm-and-signin", userId });
  });

  it("treats missing identities as a real new user (not the exists stub)", () => {
    expect(
      decidePasswordSignupNext({
        user: { id: userId },
        session: null,
      }),
    ).toEqual({ action: "confirm-and-signin", userId });
  });

  it("refuses empty identities — GoTrue anti-enumeration for an existing email", () => {
    expect(
      decidePasswordSignupNext({
        user: { id: userId, identities: [] },
        session: null,
      }),
    ).toEqual({ action: "exists" });
  });

  it("fails closed when signUp returned no user", () => {
    expect(
      decidePasswordSignupNext({
        user: null,
        session: null,
      }),
    ).toEqual({ action: "fail" });
  });

  it("prefers the live session over empty identities", () => {
    expect(
      decidePasswordSignupNext({
        user: { id: userId, identities: [] },
        session: { access_token: "tok" },
      }),
    ).toEqual({ action: "admit-session", userId });
  });
});
