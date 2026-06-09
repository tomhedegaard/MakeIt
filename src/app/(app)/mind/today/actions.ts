"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  completeMentalSession,
  getRecentMindCheckLogs,
  getTodayMindCheck,
  persistPersonalSession,
} from "@/lib/data/mind";
import {
  buildCoachContext,
  computeMentalSignal,
} from "@/lib/mind/coach-context";
import { generatePersonalSession } from "@/lib/mind/session-generator-claude";
import { buildFallbackSession } from "@/lib/mind/session-fallback";

const CompleteSchema = z.object({
  session_id: z.string().min(1),
  context: z
    .enum(["library", "prescribed_by_coach", "suggested_by_adaptive", "pre_session", "post_session"])
    .default("library"),
});

export async function completeMentalSessionAction(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const member = await getSession();
  if (!member) return { error: "not_authed" };

  const parsed = CompleteSchema.safeParse({
    session_id: formData.get("session_id"),
    context: formData.get("context") ?? "library",
  });
  if (!parsed.success) return { error: "invalid_input" };

  // We don't know is_hero from the form — look up briefly. Most personal
  // sessions are NOT hero; library entries ARE. We default to false and
  // the data layer's Reps award trusts that.
  const isHero = parsed.data.session_id.startsWith("hero-");
  const result = await completeMentalSession({
    memberId: member.id,
    sessionId: parsed.data.session_id,
    isHero,
    context: parsed.data.context,
  });

  if (!result.ok) return { error: result.error };

  console.info("[mind] mental_session_completed", {
    memberId: member.id,
    sessionId: parsed.data.session_id,
    context: parsed.data.context,
  });

  revalidatePath("/mind/today");
  revalidatePath("/mind/sessions");
  return { ok: true };
}

/**
 * Generate (or fetch cached) today's personal session for the member.
 * Used by the /mind/today page on first visit each day. The cron in
 * MH-7 pre-generates ahead of the morning push; this is the fallback
 * path for members who arrive before the cron runs.
 */
export async function ensureTodayPersonalSession(): Promise<
  | { id: string }
  | { error: string }
> {
  const member = await getSession();
  if (!member) return { error: "not_authed" };

  const today = new Date().toISOString().slice(0, 10);
  const [todayMc, logs] = await Promise.all([
    getTodayMindCheck(member.id),
    getRecentMindCheckLogs(member.id, 7),
  ]);

  const signal = computeMentalSignal(logs);
  const ctx = buildCoachContext({
    member: { handle: member.handle, tier: member.tier },
    mindToday: todayMc
      ? {
          energy: todayMc.energy,
          stress: todayMc.stress,
          focus: todayMc.focus,
          note: todayMc.note,
        }
      : null,
    signal,
    hrv: { week_mean_rmssd_ms: null, prior_week_mean_rmssd_ms: null, week_reading_count: 0 },
    training: {
      sessions_completed_7d: 0,
      sessions_planned_7d: 0,
      last_session_rpe: null,
      last_session_was: null,
    },
    forDate: today,
  });

  const generated = await generatePersonalSession(ctx);
  const script = generated?.script ?? buildFallbackSession(ctx);

  const persisted = await persistPersonalSession({
    memberId: member.id,
    forDate: today,
    script,
    promptSeed: { ctx_hash: simpleHash(JSON.stringify(ctx)) },
    generatedBy: generated ? "claude" : "imported",
  });

  if (!persisted) return { error: "persist_failed" };
  return { id: persisted.id };
}

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h.toString(16);
}
