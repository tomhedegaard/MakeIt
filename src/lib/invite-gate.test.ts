import { describe, expect, it } from "vitest";
import {
  NEW_AUTH_USER_WINDOW_MS,
  admitInviteConsume,
  admitInviteValidation,
  decideInviteConsume,
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
});
