/**
 * Official magic-link callback — post-exchange sequencing.
 *
 * Pure orchestration with injected deps so returning vs new-user
 * invite rules can be unit-tested without Next.js or a live
 * Supabase. The route wires consumeInvite / signOut.
 *
 * Returning members (already admitted, or official OTP sent with
 * shouldCreateUser:false and no invite) land. New / un-admitted
 * users still fail closed without a successful consume.
 */
import {
  admitInviteConsume,
  decideInviteConsume,
  normalizeInviteCode,
  type InviteRpcResult,
} from "./invite-gate";

export type MagicLinkCallbackErr = "invite" | "callback";

export type MagicLinkCallbackFinish =
  | { ok: true }
  | { ok: false; err: MagicLinkCallbackErr };

async function safeSignOut(signOut: () => Promise<unknown>): Promise<void> {
  try {
    await signOut();
  } catch {
    // Best-effort: leftover cookies must not look like success.
  }
}

export function isReturningMagicLinkInvite(
  invite: string | null | undefined,
): boolean {
  return !normalizeInviteCode(invite ?? "");
}

export async function finishMagicLinkCallback(args: {
  user: { id: string; created_at?: string | null } | null | undefined;
  invite: string | null;
  nowMs: number;
  alreadyAdmitted: boolean | null;
  consumeInvite: (code: string, userId: string) => Promise<InviteRpcResult>;
  signOut: () => Promise<unknown>;
}): Promise<MagicLinkCallbackFinish> {
  const user = args.user;
  if (!user?.id) {
    await safeSignOut(args.signOut);
    return { ok: false, err: "callback" };
  }

  const decision = decideInviteConsume({
    invite: args.invite,
    userCreatedAt: user.created_at,
    nowMs: args.nowMs,
    alreadyAdmitted: args.alreadyAdmitted,
    returningMagicLink: isReturningMagicLinkInvite(args.invite),
  });

  if (decision.action === "reject") {
    await safeSignOut(args.signOut);
    return { ok: false, err: "invite" };
  }

  if (decision.action === "consume") {
    const consumed = await args.consumeInvite(decision.invite, user.id);
    if (!admitInviteConsume(consumed)) {
      await safeSignOut(args.signOut);
      return { ok: false, err: "invite" };
    }
  }

  return { ok: true };
}
