"use server";

import { z } from "zod";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/service";
import { isLocale } from "@/i18n/config";

const emailSchema = z.string().trim().toLowerCase().pipe(z.email()).pipe(z.string().max(320));

/**
 * Public waitlist signup from the marketing landing page.
 *
 * Unauthenticated by design — the caller is a visitor without an
 * invite code. Writes go through the service-role client so the
 * table needs no anon RLS policy. Demo mode (no Supabase env)
 * no-ops with ok so the landing flow can be demoed offline.
 *
 * Duplicate emails resolve to ok without writing (unique index +
 * ignoreDuplicates) so the response never leaks whether an email
 * is already on the list.
 */
export async function joinWaitlistAction(
  formData: FormData
): Promise<{ ok: boolean }> {
  // Honeypot — bots fill every field; humans never see this one.
  if (String(formData.get("company") ?? "") !== "") return { ok: true };

  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { ok: false };

  if (!SUPABASE_ENABLED) return { ok: true };

  const localeRaw = String(formData.get("locale") ?? "");

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("waitlist_signups")
      .upsert(
        {
          email: parsed.data,
          source: "landing",
          locale: isLocale(localeRaw) ? localeRaw : null,
        },
        { onConflict: "email", ignoreDuplicates: true }
      );
    if (error) {
      // Unique-violation race still means "you're on the list".
      if (error.code === "23505") return { ok: true };
      return { ok: false };
    }
    return { ok: true };
  } catch {
    // Service key missing in a half-configured env — fail soft.
    return { ok: false };
  }
}
