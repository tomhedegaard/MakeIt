import { describe, expect, it, vi } from "vitest";
import { finishInvitePasswordSignup } from "./password-signup";

const USER_ID = "user-new";
const EMAIL = "testy@example.com";
const PASSWORD = "correct-horse";
const INVITE = "TESTY-01";

function deps(overrides: {
  signUpUser?: { id: string; identities?: unknown[] } | null;
  signUpSession?: { access_token?: string } | null;
  confirmEmail?: ReturnType<typeof vi.fn>;
  signInWithPassword?: ReturnType<typeof vi.fn>;
  consumeInvite?: ReturnType<typeof vi.fn>;
  signOut?: ReturnType<typeof vi.fn>;
} = {}) {
  const confirmEmail = overrides.confirmEmail ?? vi.fn(async () => true);
  const signInWithPassword =
    overrides.signInWithPassword ??
    vi.fn(async () => ({
      user: { id: USER_ID },
      session: { access_token: "tok" },
      error: null,
    }));
  const consumeInvite = overrides.consumeInvite ?? vi.fn(async () => true);
  const signOut = overrides.signOut ?? vi.fn(async () => undefined);

  return {
    args: {
      signUpUser:
        overrides.signUpUser === undefined
          ? { id: USER_ID, identities: [{ id: "ident-1" }] }
          : overrides.signUpUser,
      signUpSession:
        overrides.signUpSession === undefined ? null : overrides.signUpSession,
      email: EMAIL,
      password: PASSWORD,
      invite: INVITE,
      confirmEmail,
      signInWithPassword,
      consumeInvite,
      signOut,
    },
    confirmEmail,
    signInWithPassword,
    consumeInvite,
    signOut,
  };
}

describe("finishInvitePasswordSignup", () => {
  it("session present → consume invite and land on dashboard (no confirm)", async () => {
    const { args, confirmEmail, signInWithPassword, consumeInvite, signOut } =
      deps({
        signUpSession: { access_token: "tok" },
      });

    await expect(finishInvitePasswordSignup(args)).resolves.toEqual({
      ok: true,
      redirect: "/dashboard",
    });
    expect(confirmEmail).not.toHaveBeenCalled();
    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(consumeInvite).toHaveBeenCalledWith(INVITE, USER_ID);
    expect(signOut).not.toHaveBeenCalled();
  });

  it("no session + created user → confirm that user, sign in, consume, dashboard", async () => {
    const { args, confirmEmail, signInWithPassword, consumeInvite } = deps();

    await expect(finishInvitePasswordSignup(args)).resolves.toEqual({
      ok: true,
      redirect: "/dashboard",
    });
    expect(confirmEmail).toHaveBeenCalledTimes(1);
    expect(confirmEmail).toHaveBeenCalledWith(USER_ID);
    expect(signInWithPassword).toHaveBeenCalledWith(EMAIL, PASSWORD);
    expect(consumeInvite).toHaveBeenCalledWith(INVITE, USER_ID);
  });

  it("empty identities → exists, no confirm and no admit", async () => {
    const { args, confirmEmail, consumeInvite, signOut } = deps({
      signUpUser: { id: USER_ID, identities: [] },
    });

    await expect(finishInvitePasswordSignup(args)).resolves.toEqual({
      ok: false,
      err: "exists",
    });
    expect(confirmEmail).not.toHaveBeenCalled();
    expect(consumeInvite).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("invite consume false → sign out leftovers, do not claim success", async () => {
    const { args, consumeInvite, signOut } = deps({
      signUpSession: { access_token: "tok" },
      consumeInvite: vi.fn(async () => false),
    });

    await expect(finishInvitePasswordSignup(args)).resolves.toEqual({
      ok: false,
      err: "invite",
    });
    expect(consumeInvite).toHaveBeenCalledWith(INVITE, USER_ID);
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("invite consume null (RPC down) → fail closed, sign out", async () => {
    const { args, signOut } = deps({
      consumeInvite: vi.fn(async () => null),
    });

    await expect(finishInvitePasswordSignup(args)).resolves.toEqual({
      ok: false,
      err: "invite",
    });
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("confirm failure → signup error, sign out, never consume", async () => {
    const { args, consumeInvite, signOut } = deps({
      confirmEmail: vi.fn(async () => false),
    });

    await expect(finishInvitePasswordSignup(args)).resolves.toEqual({
      ok: false,
      err: "signup",
    });
    expect(consumeInvite).not.toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("sign-in credentials failure after confirm → creds, sign out, never consume", async () => {
    const { args, consumeInvite, signOut } = deps({
      signInWithPassword: vi.fn(async () => ({
        user: null,
        session: null,
        error: { message: "Invalid login credentials" },
      })),
    });

    await expect(finishInvitePasswordSignup(args)).resolves.toEqual({
      ok: false,
      err: "creds",
    });
    expect(consumeInvite).not.toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("sign-in without session after confirm → signup, sign out", async () => {
    const { args, consumeInvite, signOut } = deps({
      signInWithPassword: vi.fn(async () => ({
        user: { id: USER_ID },
        session: null,
        error: null,
      })),
    });

    await expect(finishInvitePasswordSignup(args)).resolves.toEqual({
      ok: false,
      err: "signup",
    });
    expect(consumeInvite).not.toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("no user from signUp → signup, no confirm", async () => {
    const { args, confirmEmail, consumeInvite } = deps({
      signUpUser: null,
    });

    await expect(finishInvitePasswordSignup(args)).resolves.toEqual({
      ok: false,
      err: "signup",
    });
    expect(confirmEmail).not.toHaveBeenCalled();
    expect(consumeInvite).not.toHaveBeenCalled();
  });
});
