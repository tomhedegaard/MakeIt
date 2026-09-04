/**
 * Today insight cards — live composer.
 *
 * Demo uses the Heart-first fixture. Connected mode only emits cards
 * from real HRV / session / mind-check signals. No invented squat-day
 * or low-HRV copy for an empty new member.
 */

import { isOutOfBand, qualitativeFromBucket } from "@/lib/hrv/band";
import {
  buildTodayInsightStream,
  demoInsightStream,
  type InsightCardModel,
} from "@/lib/dashboard/insight-stream";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";

import { getTodaySessionSignal } from "./dashboard";
import { getLatestHrvReading } from "./hrv";
import { hasMindCheckToday } from "./mind";

export async function getTodayInsightCards(
  memberId: string,
  sessionHref: string | null,
): Promise<InsightCardModel[]> {
  const href = sessionHref ?? "/coaching";

  if (!SUPABASE_ENABLED) {
    return demoInsightStream(href);
  }

  const [reading, session, mindChecked] = await Promise.all([
    getLatestHrvReading(memberId),
    getTodaySessionSignal(memberId),
    hasMindCheckToday(memberId),
  ]);

  const bucket = reading?.readinessBucket ?? null;
  const hasSession =
    session != null &&
    (session.state === "assigned" ||
      session.state === "done" ||
      session.state === "skipped");

  return buildTodayInsightStream({
    sessionHref: href,
    hasHrv: reading != null,
    qualitative: qualitativeFromBucket(bucket),
    outOfBand: isOutOfBand(bucket),
    mindCheckedToday: mindChecked,
    hasSession,
  });
}
