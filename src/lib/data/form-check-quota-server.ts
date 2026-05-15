/**
 * Server-only DB fetch for form-check quota usage.
 *
 * Split from `./form-check-quota.ts` so client components can still
 * import the type + describeReset without pulling Supabase server
 * client into the browser bundle.
 *
 * Counting strategy: form_checks rows are the quota log. An insert
 * happens only when Claude actually responds (mock fallback does not
 * insert), so quota naturally tracks real API spend. No separate
 * action log needed.
 */
import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tier } from "@/lib/auth";
import {
  FORM_CHECK_LIMIT,
  firstOfNextMonthUtc,
  firstOfThisMonthUtc,
  type FormCheckQuota,
} from "./form-check-quota";

export async function getFormCheckQuota(
  memberId: string,
  tier: Tier,
): Promise<FormCheckQuota> {
  const limit = FORM_CHECK_LIMIT[tier] ?? 0;
  const periodStart = firstOfThisMonthUtc();
  const resetsAt = firstOfNextMonthUtc();

  const supabase = await createClient();
  if (!supabase) {
    // Demo mode — no enforcement.
    return {
      used: 0,
      limit,
      remaining: limit,
      resetsAt,
      hasRemaining: limit > 0,
    };
  }

  const { count } = await supabase
    .from("form_checks")
    .select("id", { count: "exact", head: true })
    .eq("member_id", memberId)
    .gte("created_at", periodStart);

  const used = count ?? 0;
  const remaining = Math.max(0, limit - used);

  return {
    used,
    limit,
    remaining,
    resetsAt,
    hasRemaining: remaining > 0,
  };
}
