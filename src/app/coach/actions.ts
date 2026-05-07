"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { getWeekDigest } from "@/lib/data/digest";
import { sendWeeklyDigestEmail } from "@/lib/email/templates/weekly-digest";

/**
 * Send the weekly digest email to every member with an email on file.
 * Coach-only via RLS — non-coach calls fail at the members SELECT.
 *
 * Returns the count of successfully sent emails. Failures are logged
 * but don't abort the loop — partial sends are better than none.
 */
export async function sendWeeklyDigestAction(): Promise<{
  ok: boolean;
  sent: number;
  failed: number;
  skipped: number;
}> {
  if (!SUPABASE_ENABLED) {
    return { ok: true, sent: 0, failed: 0, skipped: 1 };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, sent: 0, failed: 0, skipped: 0 };

  // Coach gate — query a coach-scoped resource first, RLS rejects others.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, sent: 0, failed: 0, skipped: 0 };

  const { data: meRow } = await supabase
    .from("members")
    .select("is_coach")
    .eq("id", user.id)
    .maybeSingle();
  if (!meRow?.is_coach) {
    return { ok: false, sent: 0, failed: 0, skipped: 0 };
  }

  const digest = await getWeekDigest();

  const { data: targets } = await supabase
    .from("members")
    .select("email, handle")
    .not("email", "is", null);

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3002";
  const baseUrl = `${proto}://${host}`;

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const t of targets ?? []) {
    if (!t.email) {
      skipped += 1;
      continue;
    }
    try {
      const res = await sendWeeklyDigestEmail({
        to: t.email,
        recipientHandle: t.handle,
        digest,
        baseUrl,
      });
      if (res.ok) sent += 1;
      else if (res.skipped) skipped += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }

  return { ok: true, sent, failed, skipped };
}
