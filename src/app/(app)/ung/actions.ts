"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  createInvitation,
  endGuardianship,
  resendInvitation,
  setGuardianConsent,
  youthPilotAllowed,
} from "@/lib/youth/guardianship";
import { GuardianInviteSchema } from "@/lib/youth/rules";

async function requirePilotGuardian() {
  const member = await getSession();
  if (!member) redirect("/login");
  if (!youthPilotAllowed(member)) redirect("/dashboard");
  return member;
}

export async function inviteYouthAction(formData: FormData): Promise<void> {
  const member = await requirePilotGuardian();
  const parsed = GuardianInviteSchema.safeParse({
    firstName: formData.get("firstName"),
    email: formData.get("email"),
    birthDate: formData.get("birthDate"),
    consentRecovery: formData.get("consentRecovery") === "on",
    consentMind: formData.get("consentMind") === "on",
    declaration: formData.get("declaration"),
  });
  if (!parsed.success) redirect("/ung?err=form");
  const res = await createInvitation(member, parsed.data);
  revalidatePath("/ung");
  redirect(res.ok ? "/ung?sent=1" : `/ung?err=${res.reason}`);
}

export async function resendInvitationAction(formData: FormData): Promise<void> {
  const member = await requirePilotGuardian();
  const ok = await resendInvitation(member, String(formData.get("id") ?? ""));
  revalidatePath("/ung");
  redirect(ok ? "/ung?sent=1" : "/ung?err=failed");
}

export async function updateConsentAction(formData: FormData): Promise<void> {
  const member = await requirePilotGuardian();
  const ok = await setGuardianConsent(member, String(formData.get("id") ?? ""), {
    recovery: formData.get("consentRecovery") === "on",
    mind: formData.get("consentMind") === "on",
  });
  revalidatePath("/ung");
  redirect(ok ? "/ung?saved=1" : "/ung?err=failed");
}

export async function endGuardianshipAction(formData: FormData): Promise<void> {
  const member = await requirePilotGuardian();
  if (formData.get("confirm") !== "on") redirect("/ung?err=confirm");
  const ok = await endGuardianship(member, String(formData.get("id") ?? ""));
  revalidatePath("/ung");
  redirect(ok ? "/ung?ended=1" : "/ung?err=failed");
}
