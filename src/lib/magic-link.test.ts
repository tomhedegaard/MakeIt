import { describe, expect, it, vi } from "vitest";
import { NEW_AUTH_USER_WINDOW_MS } from "./invite-gate";
import {
  finishMagicLinkCallback,
  isReturningMagicLinkInvite,
} from "./magic-link";

const USER_ID = "user-returning";
const NOW = Date.parse("2026-09-08T12:00:00.000Z");
const NEW_CREATED = new Date(NOW - 60 * 60 * 1000).toISOString();
const OLD_CREATED = new Date(NOW - NEW_AUTH_USER_WINDOW_MS - 1).toISOString();

function deps(
  overrides: {
    user?: { id: string; created_at?: string | null } | null;
    invite?: string | null;
    alreadyAdmitted?: boolean | null;
    consumeInvite?: ReturnType<typeof vi.fn>;
    signOut?: ReturnType<typeof vi.fn>;
  } = {},
) {
  const consumeInvite = overrides.consumeInvite ?? vi.fn(async () => true);
  const signOut = overrides.signOut ?? vi.fn(async () => undefined);

  return {
    args: {
      user:
        overrides.user === undefined
          ? { id: USER_ID, created_at: NEW_CREATED }
          : overrides.user,
      invite: overrides.invite === undefined ? null : overrides.invite,
      nowMs: NOW,
      alreadyAdmitted:
        overrides.alreadyAdmitted === undefined
          ? true
          : overrides.alreadyAdmitted,
      consumeInvite,
      signOut,
    },
    consumeInvite,
    signOut,
  };
}

describe("isReturningMagicLinkInvite", () => {
  it("is true when the callback has no usable invite", () => {
    expect(isReturningMagicLinkInvite(null)).toBe(true);
    expect(isReturningMagicLinkInvite("   ")).toBe(true);
    expect(isReturningMagicLinkInvite("TESTY-01")).toBe(false);
  });
});

describe("finishMagicLinkCallback", () => {
  it("returning + admitted + no invite → land, do not consume", async () => {
    const { args, consumeInvite, signOut } = deps({
      alreadyAdmitted: true,
      invite: null,
    });

    await expect(finishMagicLinkCallback(args)).resolves.toEqual({ ok: true });
    expect(consumeInvite).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("returning this week + admitted probe down + no invite → land", async () => {
    const { args, consumeInvite, signOut } = deps({
      alreadyAdmitted: null,
      invite: null,
      user: { id: USER_ID, created_at: NEW_CREATED },
    });

    await expect(finishMagicLinkCallback(args)).resolves.toEqual({ ok: true });
    expect(consumeInvite).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("un-admitted leftover + no invite → reject and sign out", async () => {
    const { args, consumeInvite, signOut } = deps({
      alreadyAdmitted: false,
      invite: null,
    });

    await expect(finishMagicLinkCallback(args)).resolves.toEqual({
      ok: false,
      err: "invite",
    });
    expect(consumeInvite).not.toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("new user + valid invite → consume then land", async () => {
    const { args, consumeInvite, signOut } = deps({
      alreadyAdmitted: false,
      invite: "  testy-01  ",
    });

    await expect(finishMagicLinkCallback(args)).resolves.toEqual({ ok: true });
    expect(consumeInvite).toHaveBeenCalledWith("TESTY-01", USER_ID);
    expect(signOut).not.toHaveBeenCalled();
  });

  it("new user + consume false → sign out, do not claim success", async () => {
    const { args, consumeInvite, signOut } = deps({
      alreadyAdmitted: false,
      invite: "TESTY-01",
      consumeInvite: vi.fn(async () => false),
    });

    await expect(finishMagicLinkCallback(args)).resolves.toEqual({
      ok: false,
      err: "invite",
    });
    expect(consumeInvite).toHaveBeenCalledWith("TESTY-01", USER_ID);
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("new user + consume null (RPC down) → fail closed, sign out", async () => {
    const { args, signOut } = deps({
      alreadyAdmitted: false,
      invite: "TESTY-01",
      consumeInvite: vi.fn(async () => null),
    });

    await expect(finishMagicLinkCallback(args)).resolves.toEqual({
      ok: false,
      err: "invite",
    });
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("no user after exchange → callback error, sign out", async () => {
    const { args, consumeInvite, signOut } = deps({
      user: null,
    });

    await expect(finishMagicLinkCallback(args)).resolves.toEqual({
      ok: false,
      err: "callback",
    });
    expect(consumeInvite).not.toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("pre-migration existing user without invite still lands (7-day skip)", async () => {
    const { args, consumeInvite } = deps({
      alreadyAdmitted: null,
      invite: null,
      user: { id: USER_ID, created_at: OLD_CREATED },
    });

    await expect(finishMagicLinkCallback(args)).resolves.toEqual({ ok: true });
    expect(consumeInvite).not.toHaveBeenCalled();
  });
});
