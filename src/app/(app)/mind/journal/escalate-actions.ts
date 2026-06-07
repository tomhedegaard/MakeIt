"use server";

import { z } from "zod";
import { getSession } from "@/lib/auth";
import { escalateMentalSafetyToCoach } from "@/lib/data/mind";

const Schema = z.object({
  summary: z.string().min(4).max(1000),
});

/**
 * Member-initiated coach escalation. Always opt-in — we NEVER call
 * this automatically. Submits the member's own summary text; Munk
 * never sees the raw journal.
 */
export async function escalateMentalSafetyAction(
  formData: FormData,
): Promise<{ ok: true; alertId: string } | { error: string }> {
  const member = await getSession();
  if (!member) return { error: "not_authed" };

  const parsed = Schema.safeParse({ summary: formData.get("summary") });
  if (!parsed.success) return { error: "invalid_input" };

  const result = await escalateMentalSafetyToCoach(member.id, {
    summary: parsed.data.summary,
  });

  if (!result.ok) return { error: result.error };

  console.info("[mind] mental_safety_escalation_accepted", {
    memberId: member.id,
    alertId: result.alertId,
    summaryLength: parsed.data.summary.length,
  });

  return { ok: true, alertId: result.alertId };
}
