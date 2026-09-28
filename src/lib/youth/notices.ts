/**
 * MakeIt Ung — notices to the guardian (spec afsnit 5), the server half.
 *
 * One guardian_notices row per message; the young member reads the same
 * row in the app. Writes use the service-role client (0065 has no client
 * write policies). The cooldown is checked per young member and sign, so
 * two guardians of the same young member get the same notice once each.
 */
import "server-only";
import { isLocale, defaultLocale } from "@/i18n/config";
import { copenhagenTodayIso, isoPlusDays } from "@/lib/dates/copenhagen";
import { sendYouthNoticeEmail } from "@/lib/email/templates/youth-notice";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  evaluateSignals,
  inCooldown,
  levelOf,
  SIGNAL_WINDOW_DAYS,
  type NoticeSignal,
  type SignalDetail,
} from "./signals";

export type GuardianNotice = Database["public"]["Tables"]["guardian_notices"]["Row"];

type Svc = ReturnType<typeof createServiceClient>;

async function activeGuardianships(svc: Svc, youthMemberId: string) {
  const { data } = await svc
    .from("guardianships")
    .select("id, guardian_member_id, youth_first_name")
    .eq("youth_member_id", youthMemberId)
    .eq("status", "active");
  return data ?? [];
}

export type RaiseResult = { notified: boolean; reason: "sent" | "cooldown" | "no_guardian" | "failed" };

/**
 * Record a notice for every active guardian of the young member and
 * e-mail it. Returns notified=true when a guardian has been told, now
 * or inside the cooldown, so the young member's screen can say so.
 */
export async function raiseNotice(
  youthMemberId: string,
  notice: { signal: NoticeSignal; detail?: SignalDetail; observedFrom?: string; observedTo?: string },
  now: Date = new Date(),
): Promise<RaiseResult> {
  const svc = createServiceClient();
  const guardianships = await activeGuardianships(svc, youthMemberId);
  if (guardianships.length === 0) return { notified: false, reason: "no_guardian" };

  const { data: last } = await svc
    .from("guardian_notices")
    .select("created_at")
    .eq("youth_member_id", youthMemberId)
    .eq("signal", notice.signal)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (inCooldown(notice.signal, last ? new Date(last.created_at) : null, now)) {
    return { notified: true, reason: "cooldown" };
  }

  const detail = notice.detail ?? {};
  let recorded = 0;
  for (const g of guardianships) {
    const { data: row, error } = await svc
      .from("guardian_notices")
      .insert({
        guardianship_id: g.id,
        guardian_member_id: g.guardian_member_id,
        youth_member_id: youthMemberId,
        level: levelOf(notice.signal),
        signal: notice.signal,
        detail: detail as Json,
        observed_from: notice.observedFrom ?? null,
        observed_to: notice.observedTo ?? null,
      })
      .select("id")
      .single();
    if (error || !row) {
      console.warn("[youth] guardian notice insert failed", error?.message);
      continue;
    }
    recorded += 1;

    const { data: guardian } = await svc
      .from("members")
      .select("email, locale")
      .eq("id", g.guardian_member_id)
      .maybeSingle();
    const sent = guardian?.email
      ? await sendYouthNoticeEmail({
          to: guardian.email,
          locale: isLocale(guardian.locale) ? guardian.locale : defaultLocale,
          youthName: g.youth_first_name,
          signal: notice.signal,
          detail,
        })
      : { ok: false };
    await svc
      .from("guardian_notices")
      .update(
        sent.ok
          ? { emailed_at: new Date().toISOString() }
          : { email_error: "skipped" in sent && sent.skipped ? "email_disabled" : "send_failed" },
      )
      .eq("id", row.id);
  }
  return recorded > 0 ? { notified: true, reason: "sent" } : { notified: false, reason: "failed" };
}

/** The journal crisis hook: an acute notice, if this is a young member. */
export async function notifyGuardiansOfCrisis(memberId: string): Promise<boolean> {
  try {
    return (await raiseNotice(memberId, { signal: "crisis_language" })).notified;
  } catch (e) {
    console.warn("[youth] crisis notice failed", e);
    return false;
  }
}

/**
 * The daily check behind /api/cron/youth-signals: every young member
 * with an active guardian, their finished sessions over the window,
 * the fixed rules, then a notice per sign outside its cooldown.
 */
export async function runYouthSignalCheck(now: Date = new Date()) {
  const svc = createServiceClient();
  const { data: rows } = await svc
    .from("guardianships")
    .select("youth_member_id")
    .eq("status", "active")
    .not("youth_member_id", "is", null);
  const youthIds = [...new Set((rows ?? []).map((r) => r.youth_member_id as string))];
  if (youthIds.length === 0) return { checked: 0, notices: 0 };

  const today = copenhagenTodayIso(now);
  // One day of slack on the UTC side; evaluateSignals trims to the window.
  const since = `${isoPlusDays(today, -SIGNAL_WINDOW_DAYS - 1)}T00:00:00Z`;
  const { data: sessions } = await svc
    .from("sessions")
    .select("member_id, completed_at")
    .in("member_id", youthIds)
    .eq("status", "completed")
    .gte("completed_at", since);

  const days = new Map<string, string[]>();
  for (const s of sessions ?? []) {
    if (!s.completed_at) continue;
    const list = days.get(s.member_id) ?? [];
    list.push(copenhagenTodayIso(new Date(s.completed_at)));
    days.set(s.member_id, list);
  }

  let notices = 0;
  for (const youthId of youthIds) {
    for (const hit of evaluateSignals(days.get(youthId) ?? [], today)) {
      const res = await raiseNotice(youthId, hit, now);
      if (res.reason === "sent") notices += 1;
    }
  }
  return { checked: youthIds.length, notices };
}

/** Notices the young member has not marked as seen, oldest first. */
export async function unseenNoticesForYouth(youthMemberId: string): Promise<GuardianNotice[]> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("guardian_notices")
    .select("*")
    .eq("youth_member_id", youthMemberId)
    .is("youth_seen_at", null)
    .order("created_at", { ascending: true })
    .limit(10);
  // Two guardians get one row each; the young member sees the message once.
  const seen = new Set<string>();
  return (data ?? []).filter((n) => {
    const key = `${n.signal}:${n.created_at.slice(0, 16)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Mark a notice seen. Only the young member it is about can do this. */
export async function markNoticeSeen(youthMemberId: string, noticeId: string): Promise<boolean> {
  const svc = createServiceClient();
  const { data: notice } = await svc
    .from("guardian_notices")
    .select("signal, created_at")
    .eq("id", noticeId)
    .eq("youth_member_id", youthMemberId)
    .maybeSingle();
  if (!notice) return false;
  // Mark the twin rows (one per guardian) of the same message too.
  const { error } = await svc
    .from("guardian_notices")
    .update({ youth_seen_at: new Date().toISOString() })
    .eq("youth_member_id", youthMemberId)
    .eq("signal", notice.signal)
    .is("youth_seen_at", null)
    .lte("created_at", notice.created_at);
  return !error;
}

/** The guardian's list on /ung, newest first. */
export async function noticesForGuardian(guardianMemberId: string): Promise<GuardianNotice[]> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("guardian_notices")
    .select("*")
    .eq("guardian_member_id", guardianMemberId)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}
