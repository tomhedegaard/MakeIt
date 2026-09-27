/**
 * MakeIt Ung — the server half (spec afsnit 2 og 6).
 *
 * Every write goes through the service-role client: guardianships has
 * no client write policies, and account_type is guarded by 0062/0063.
 * The invitation token is only ever stored as a SHA-256 hash.
 */
import "server-only";
import { COMPANY } from "@/lib/company";
import type { Member } from "@/lib/auth";
import { sendYouthInviteEmail } from "@/lib/email/templates/youth-invite";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/database.types";
import {
  hashInviteToken,
  inviteExpiry,
  isYouthAge,
  newInviteToken,
  type GuardianInvite,
  type YouthAccept,
} from "./rules";

export type Guardianship = Database["public"]["Tables"]["guardianships"]["Row"];

/**
 * Closed pilot (Toms beslutning 5): guardians on YOUTH_PILOT_GUARDIANS
 * (comma-separated e-mails) and admins, for testing.
 */
export function youthPilotAllowed(member: Pick<Member, "email" | "isAdmin">): boolean {
  if (member.isAdmin) return true;
  const list = (process.env.YOUTH_PILOT_GUARDIANS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!member.email && list.includes(member.email.toLowerCase());
}

export async function guardianshipsFor(guardianId: string): Promise<Guardianship[]> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("guardianships")
    .select("*")
    .eq("guardian_member_id", guardianId)
    .in("status", ["invited", "active"])
    .order("created_at", { ascending: false });
  return data ?? [];
}

function danishDate(iso: string): string {
  return new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Copenhagen" }).format(new Date(iso));
}

async function sendInvite(g: Pick<Guardianship, "youth_email" | "youth_first_name" | "invite_expires_at">, token: string, guardianName: string) {
  return sendYouthInviteEmail({
    to: g.youth_email,
    firstName: g.youth_first_name,
    guardianName,
    url: `${COMPANY.appUrl}/ung/invitation/${token}`,
    expiresDa: danishDate(g.invite_expires_at),
  });
}

export type InviteResult = { ok: true } | { ok: false; reason: "age" | "exists" | "open" | "failed" };

export async function createInvitation(guardian: Member, input: GuardianInvite): Promise<InviteResult> {
  if (!isYouthAge(input.birthDate)) return { ok: false, reason: "age" };
  if (guardian.email && guardian.email.toLowerCase() === input.email) return { ok: false, reason: "exists" };
  const svc = createServiceClient();

  // An e-mail that already has an account cannot become a young account.
  const { data: existing } = await svc.from("members").select("id").eq("email", input.email).maybeSingle();
  if (existing) return { ok: false, reason: "exists" };

  const token = newInviteToken();
  const row = {
    guardian_member_id: guardian.id,
    youth_first_name: input.firstName,
    youth_email: input.email,
    youth_birth_date: input.birthDate,
    guardian_consent_recovery: input.consentRecovery,
    guardian_consent_mind: input.consentMind,
    guardian_declared_at: new Date().toISOString(),
    invite_token_hash: hashInviteToken(token),
    invite_expires_at: inviteExpiry(),
  };
  const { error } = await svc.from("guardianships").insert(row);
  if (error) return { ok: false, reason: error.code === "23505" ? "open" : "failed" };

  await sendInvite(row, token, guardian.displayName ?? guardian.handle);
  return { ok: true };
}

export async function resendInvitation(guardian: Member, id: string): Promise<boolean> {
  const svc = createServiceClient();
  const token = newInviteToken();
  const expires = inviteExpiry();
  const { data } = await svc
    .from("guardianships")
    .update({ invite_token_hash: hashInviteToken(token), invite_expires_at: expires, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("guardian_member_id", guardian.id)
    .eq("status", "invited")
    .select("youth_email, youth_first_name, invite_expires_at")
    .maybeSingle();
  if (!data) return false;
  await sendInvite(data, token, guardian.displayName ?? guardian.handle);
  return true;
}

/** What the invitation page may show. No birth date, no guardian e-mail. */
export type InvitationView = {
  firstName: string;
  email: string;
  guardianName: string;
  guardianConsentRecovery: boolean;
  guardianConsentMind: boolean;
};

async function openInvitation(token: string) {
  const svc = createServiceClient();
  const { data } = await svc
    .from("guardianships")
    .select("*")
    .eq("invite_token_hash", hashInviteToken(token))
    .maybeSingle();
  if (!data || data.status !== "invited") return null;
  if (new Date(data.invite_expires_at).getTime() < Date.now()) return null;
  if (!isYouthAge(data.youth_birth_date)) return null;
  return data;
}

export async function invitationView(token: string): Promise<InvitationView | null> {
  const g = await openInvitation(token);
  if (!g) return null;
  const svc = createServiceClient();
  const { data: guardian } = await svc.from("members").select("display_name, handle").eq("id", g.guardian_member_id).maybeSingle();
  return {
    firstName: g.youth_first_name,
    email: g.youth_email,
    guardianName: guardian?.display_name ?? guardian?.handle ?? "Din forælder",
    guardianConsentRecovery: g.guardian_consent_recovery,
    guardianConsentMind: g.guardian_consent_mind,
  };
}

export type AcceptResult = { ok: true; email: string } | { ok: false; reason: "invalid" | "exists" | "failed" };

/**
 * The young member accepts: create the auth user (confirmed, no invite
 * code needed; the guardianship is the admission), mark the member as
 * youth and admitted, and record the young member's own consent.
 */
export async function acceptInvitation(input: YouthAccept): Promise<AcceptResult> {
  const g = await openInvitation(input.token);
  if (!g) return { ok: false, reason: "invalid" };
  const svc = createServiceClient();

  const { data: created, error } = await svc.auth.admin.createUser({
    email: g.youth_email,
    password: input.password,
    email_confirm: true,
    user_metadata: { account_type: "youth", display_name: g.youth_first_name },
  });
  if (error || !created.user) {
    return { ok: false, reason: /registered|exists/i.test(error?.message ?? "") ? "exists" : "failed" };
  }
  const youthId = created.user.id;
  const now = new Date().toISOString();

  const { error: memberErr } = await svc
    .from("members")
    .update({ account_type: "youth", invite_consumed_at: now })
    .eq("id", youthId);
  const { error: gErr } = await svc
    .from("guardianships")
    .update({
      youth_member_id: youthId,
      status: "active",
      youth_consent_recovery: input.consentRecovery && g.guardian_consent_recovery,
      youth_consent_mind: input.consentMind && g.guardian_consent_mind,
      youth_consented_at: now,
      updated_at: now,
    })
    .eq("id", g.id)
    .eq("status", "invited");

  if (memberErr || gErr) {
    // Never leave a half-made young account behind.
    await svc.auth.admin.deleteUser(youthId);
    return { ok: false, reason: "failed" };
  }
  return { ok: true, email: g.youth_email };
}

/** The guardian changes their own consent for an area (spec 2.4). */
export async function setGuardianConsent(
  guardian: Member,
  id: string,
  consent: { recovery: boolean; mind: boolean },
): Promise<boolean> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("guardianships")
    .update({
      guardian_consent_recovery: consent.recovery,
      guardian_consent_mind: consent.mind,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("guardian_member_id", guardian.id)
    .in("status", ["invited", "active"])
    .select("id")
    .maybeSingle();
  return !!data;
}

/**
 * The guardian ends MakeIt Ung. An open invitation is withdrawn; an
 * active young account is deleted with its data (spec 2.4). The
 * guardianship row stays as the record of consent and withdrawal.
 */
export async function endGuardianship(guardian: Member, id: string): Promise<boolean> {
  const svc = createServiceClient();
  const { data: g } = await svc
    .from("guardianships")
    .select("id, status, youth_member_id")
    .eq("id", id)
    .eq("guardian_member_id", guardian.id)
    .in("status", ["invited", "active"])
    .maybeSingle();
  if (!g) return false;
  if (g.youth_member_id) {
    const { error } = await svc.auth.admin.deleteUser(g.youth_member_id);
    if (error) return false;
  }
  const now = new Date().toISOString();
  await svc
    .from("guardianships")
    .update({ status: "withdrawn", withdrawn_at: now, withdrawn_by: "guardian", updated_at: now })
    .eq("id", g.id);
  return true;
}
