/**
 * Today prose — data composer (A3).
 *
 * Spec: docs/superpowers/specs/2026-09-03-dashboard-today-prose.md
 *
 * Merges existing member fetchers. No new tables, no service-role.
 * Demo uses the same HRV series + TODAY_SESSION as the chip / session
 * card, plus hasMindCheckToday (mock logs include today).
 */

import {
  buildTodayProse,
  demoTodayProseInput,
  type TodayProseModel,
} from "@/lib/dashboard/today-prose";
import { isOutOfBand, qualitativeFromBucket } from "@/lib/hrv/band";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";

import { getTodaySessionSignal } from "./dashboard";
import { getLatestHrvReading } from "./hrv";
import { hasMindCheckToday } from "./mind";

export type { TodayProseModel };

export async function getTodayProse(memberId: string): Promise<TodayProseModel> {
  if (!SUPABASE_ENABLED) {
    const mindChecked = await hasMindCheckToday(memberId);
    return buildTodayProse({
      ...demoTodayProseInput(),
      mind: { checkedToday: mindChecked },
    });
  }

  const [reading, session, mindChecked] = await Promise.all([
    getLatestHrvReading(memberId),
    getTodaySessionSignal(memberId),
    hasMindCheckToday(memberId),
  ]);

  const bucket = reading?.readinessBucket ?? null;
  return buildTodayProse({
    hrv: {
      hasReading: reading != null,
      qualitative: qualitativeFromBucket(bucket),
      outOfBand: isOutOfBand(bucket),
    },
    session,
    mind: { checkedToday: mindChecked },
  });
}
