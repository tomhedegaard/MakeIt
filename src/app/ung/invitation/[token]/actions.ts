"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptInvitation } from "@/lib/youth/guardianship";
import { YouthAcceptSchema } from "@/lib/youth/rules";

/**
 * The young member accepts the guardian's invitation: gives their own
 * consent, sets a password, and is signed in (spec afsnit 2.3).
 */
export async function acceptInvitationAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const parsed = YouthAcceptSchema.safeParse({
    token,
    password: formData.get("password"),
    consentRecovery: formData.get("consentRecovery") === "on",
    consentMind: formData.get("consentMind") === "on",
    consent: formData.get("consent"),
  });
  if (!parsed.success) redirect(`/ung/invitation/${encodeURIComponent(token)}?err=form`);

  const res = await acceptInvitation(parsed.data);
  if (!res.ok) redirect(`/ung/invitation/${encodeURIComponent(token)}?err=${res.reason}`);

  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signInWithPassword({ email: res.email, password: parsed.data.password });
  }
  redirect("/dashboard");
}
