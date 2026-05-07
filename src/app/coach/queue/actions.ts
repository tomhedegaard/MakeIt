"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { sendCoachReviewEmail } from "@/lib/email/templates/coach-review";

/**
 * Coach reviews a form-check: stamps reviewed_by/at and saves notes,
 * then (best-effort) emails the member with the coach's note inlined.
 * RLS enforces is_current_user_coach() — the action will simply fail
 * for non-coach users.
 */
export async function reviewFormCheckAction(
  formCheckId: string,
  notes: string
): Promise<{ ok: boolean }> {
  if (!SUPABASE_ENABLED) return { ok: true };

  const supabase = await createClient();
  if (!supabase) return { ok: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const trimmedNotes = notes.slice(0, 1000).trim();

  const { error } = await supabase
    .from("form_checks")
    .update({
      coach_reviewed_by: user.id,
      coach_reviewed_at: new Date().toISOString(),
      coach_notes: trimmedNotes || null,
    })
    .eq("id", formCheckId);

  if (error) return { ok: false };

  // Email the member — best-effort, never blocks the success path.
  if (trimmedNotes) {
    try {
      const { data: fc } = await supabase
        .from("form_checks")
        .select(
          `
          exercise_name, ai_score, ai_headline,
          member:members(email, handle)
        `
        )
        .eq("id", formCheckId)
        .single();

      const m = fc
        ? Array.isArray(fc.member)
          ? fc.member[0]
          : fc.member
        : null;

      if (m?.email) {
        const h = await headers();
        const proto = h.get("x-forwarded-proto") ?? "http";
        const host = h.get("host") ?? "localhost:3002";
        await sendCoachReviewEmail({
          to: m.email,
          memberHandle: m.handle,
          exerciseName: fc?.exercise_name ?? null,
          coachNotes: trimmedNotes,
          aiScore: fc?.ai_score ?? null,
          aiHeadline: fc?.ai_headline ?? null,
          baseUrl: `${proto}://${host}`,
        });
      }
    } catch (err) {
      console.warn("[email] coach review notification failed:", err);
    }
  }

  revalidatePath("/coach");
  revalidatePath("/coach/queue");
  // Surface the new note immediately on the member's surfaces.
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true };
}
