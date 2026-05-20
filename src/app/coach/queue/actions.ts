"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { sendCoachReviewEmail } from "@/lib/email/templates/coach-review";
import { isLocale, type Locale } from "@/i18n/config";
import { sendHrvAlertEmail } from "@/lib/email/templates/hrv-alert";

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
          exercise_name, ai_score, ai_headline, member_id,
          member:members(email, handle, notif_form_check_review, locale)
        `
        )
        .eq("id", formCheckId)
        .single();

      const m = fc
        ? Array.isArray(fc.member)
          ? fc.member[0]
          : fc.member
        : null;

      if (m?.email && m.notif_form_check_review !== false) {
        const h = await headers();
        const proto = h.get("x-forwarded-proto") ?? "http";
        const host = h.get("host") ?? "localhost:3002";
        const locale: Locale = isLocale(m.locale) ? m.locale : "da";
        await sendCoachReviewEmail({
          to: m.email,
          memberHandle: m.handle,
          exerciseName: fc?.exercise_name ?? null,
          coachNotes: trimmedNotes,
          aiScore: fc?.ai_score ?? null,
          aiHeadline: fc?.ai_headline ?? null,
          baseUrl: `${proto}://${host}`,
          locale,
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

/**
 * Coach sends a note on an HRV alert: stamps reviewed_by/at + status
 * = reviewed_actioned and saves the note text. Best-effort emails the
 * member with the coach's note inlined. RLS policy `coach_manages_alerts`
 * on `hrv_alerts` (for all using is_current_user_coach()) authorizes
 * the update; non-coach callers fail silently.
 *
 * Note text is required for this action — caller passes the textarea
 * value verbatim and we trim/truncate to 1000 chars.
 */
export async function sendHrvAlertNoteAction(
  alertId: string,
  noteText: string
): Promise<{ ok: boolean }> {
  if (!SUPABASE_ENABLED) return { ok: true };

  const supabase = await createClient();
  if (!supabase) return { ok: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const trimmed = noteText.slice(0, 1000).trim();
  if (!trimmed) return { ok: false };

  // Idempotent: only acts on alerts that are still `open`, so double-
  // submits / racing coaches don't clobber a prior review.
  const { data: row, error } = await supabase
    .from("hrv_alerts")
    .update({
      status: "reviewed_actioned",
      coach_note_text: trimmed,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", alertId)
    .eq("status", "open")
    .select("member_id, members:members!inner(email, handle)")
    .maybeSingle();

  if (error || !row) return { ok: false };

  // Email the member — best-effort, never blocks the success path.
  const m = Array.isArray(row.members) ? row.members[0] : row.members;
  if (m?.email) {
    try {
      const h = await headers();
      const proto = h.get("x-forwarded-proto") ?? "http";
      const host = h.get("host") ?? "localhost:3002";
      await sendHrvAlertEmail({
        to: m.email,
        memberHandle: m.handle,
        coachNotes: trimmed,
        baseUrl: `${proto}://${host}`,
      });
    } catch (err) {
      console.warn("[email] hrv-alert note failed:", err);
    }
  }

  revalidatePath("/coach");
  revalidatePath("/coach/queue");
  return { ok: true };
}

/**
 * Coach pauses a member's next session from an HRV alert: inserts a
 * member-scoped `hrv_session_modifiers` row (modifier_type =
 * 'paused_session', reason = 'coach_pause_from_alert') and links it
 * from the alert via `session_modifier_id`. The member will see the
 * pause suggestion in their session UI once that surface ships (spec §7).
 *
 * IMPORTANT — RLS note: `hrv_session_modifiers` only exposes member-
 * select and coach-opted-read policies in migration 0031; there is no
 * coach-write policy. So the modifier insert must go through the
 * service-role client. The alert update remains via the session
 * client, which is covered by `coach_manages_alerts for all`.
 */
export async function pauseSessionFromAlertAction(
  alertId: string
): Promise<{ ok: boolean }> {
  if (!SUPABASE_ENABLED) return { ok: true };

  const supabase = await createClient();
  if (!supabase) return { ok: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  // Resolve the alert's member, gated on status='open' so we don't
  // pause sessions for already-reviewed alerts.
  const { data: alertRow } = await supabase
    .from("hrv_alerts")
    .select("member_id")
    .eq("id", alertId)
    .eq("status", "open")
    .maybeSingle();
  if (!alertRow) return { ok: false };

  // Service-role for the modifier insert — see RLS note above.
  const admin = createServiceClient();
  const { data: mod, error: modErr } = await admin
    .from("hrv_session_modifiers")
    .insert({
      member_id: alertRow.member_id,
      modifier_type: "paused_session",
      reason: "coach_pause_from_alert",
      applied_value: null,
    })
    .select("id")
    .single();
  if (modErr || !mod) return { ok: false };

  const { error: updErr } = await supabase
    .from("hrv_alerts")
    .update({
      status: "reviewed_actioned",
      session_modifier_id: mod.id,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", alertId)
    .eq("status", "open");
  if (updErr) return { ok: false };

  revalidatePath("/coach/queue");
  return { ok: true };
}

/**
 * Coach marks an HRV alert as seen with no further action: stamps
 * reviewed_by/at + status = reviewed_noted. RLS `coach_manages_alerts`
 * authorizes the update. Idempotent via `.eq("status", "open")`.
 */
export async function markHrvAlertSeenAction(
  alertId: string
): Promise<{ ok: boolean }> {
  if (!SUPABASE_ENABLED) return { ok: true };

  const supabase = await createClient();
  if (!supabase) return { ok: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("hrv_alerts")
    .update({
      status: "reviewed_noted",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", alertId)
    .eq("status", "open");
  if (error) return { ok: false };

  revalidatePath("/coach/queue");
  return { ok: true };
}
