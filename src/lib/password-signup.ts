/**
 * Invite-gated password signup — post-signUp sequencing.
 *
 * Pure orchestration with injected deps so the product rule can be
 * unit-tested without Next.js or a live Supabase. The login action
 * wires confirmAuthUserEmail / signInWithPassword / consumeInvite.
 *
 * Never returns a "check your inbox" / sent=1 outcome. Fail closed.
 */
import {
  admitInviteConsume,
  decidePasswordSignupNext,
  type InviteRpcResult,
  type PasswordSignupAuthUser,
} from "./invite-gate";

export type PasswordSignupErr = "exists" | "signup" | "creds" | "invite";

export type PasswordSignupFinish =
  | { ok: true; redirect: "/dashboard" }
  | { ok: false; err: PasswordSignupErr };

async function safeSignOut(signOut: () => Promise<unknown>): Promise<void> {
  try {
    await signOut();
  } catch {
    // Best-effort: leftover cookies must not look like success.
  }
}

export async function finishInvitePasswordSignup(args: {
  signUpUser: PasswordSignupAuthUser | null | undefined;
  signUpSession: { access_token?: string } | null | undefined;
  email: string;
  password: string;
  invite: string;
  confirmEmail: (userId: string) => Promise<boolean>;
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<{
    user: { id: string } | null;
    session: unknown;
    error: { message?: string } | null;
  }>;
  consumeInvite: (code: string, userId: string) => Promise<InviteRpcResult>;
  signOut: () => Promise<unknown>;
}): Promise<PasswordSignupFinish> {
  const next = decidePasswordSignupNext({
    user: args.signUpUser,
    session: args.signUpSession,
  });

  if (next.action === "fail") return { ok: false, err: "signup" };
  if (next.action === "exists") return { ok: false, err: "exists" };

  let userId = next.userId;

  if (next.action === "confirm-and-signin") {
    const confirmed = await args.confirmEmail(userId);
    if (!confirmed) {
      await safeSignOut(args.signOut);
      return { ok: false, err: "signup" };
    }

    const signed = await args.signInWithPassword(args.email, args.password);
    if (signed.error || !signed.user || !signed.session) {
      await safeSignOut(args.signOut);
      const message = signed.error?.message ?? "";
      return {
        ok: false,
        err: /credentials/i.test(message) ? "creds" : "signup",
      };
    }
    userId = signed.user.id;
  }

  const consumed = await args.consumeInvite(args.invite, userId);
  if (!admitInviteConsume(consumed)) {
    await safeSignOut(args.signOut);
    return { ok: false, err: "invite" };
  }

  return { ok: true, redirect: "/dashboard" };
}
