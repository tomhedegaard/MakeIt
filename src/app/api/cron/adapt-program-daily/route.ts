import { NextResponse, type NextRequest } from "next/server";

import { buildEngineInput, loadEligibleMemberIds } from "@/lib/adaptive/data";
import { assertCronAuth } from "@/lib/cron/auth";
import { evaluateAdaptation } from "@/lib/adaptive/engine";
import { persistAdaptation } from "@/lib/adaptive/persist";
import { recordWatchedCronRun } from "@/lib/data/cron-runs";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Adaptive Program Engine — daily cron.
 *
 * Spec: docs/superpowers/specs/2026-05-25-adaptive-program-engine-v0-design.md
 *
 * Schedule: 03:30 UTC daily (= 05:30 CET in summer / 04:30 CET in winter).
 * Runs before most members wake up so the next session shows the adapted
 * plan when they open the app.
 *
 * For each opted-in member:
 *   1. Build a frozen EngineInput snapshot from Supabase (lib/adaptive/data).
 *   2. Run the deterministic rule layer (lib/adaptive/engine).
 *   3. If the rule layer returned anything other than no_change, ask Claude
 *      to refine the decision (lib/adaptive/reasoning-claude). On any
 *      refinement failure the rule decision is used verbatim.
 *   4. Persist via lib/adaptive/persist — idempotent on (member, session,
 *      reason='adaptive_v0'), and emits a matching hrv_alerts row for any
 *      decision that warrants human review.
 *
 * Per-member try/catch keeps one member's failure from aborting the batch.
 * Returns a JSON summary used by the ops dashboard.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const unauthorized = assertCronAuth(request);
  if (unauthorized) return unauthorized;

  const supabase = createServiceClient();
  const now = new Date();

  // Load opted-in members.
  let memberIds: string[];
  try {
    memberIds = await loadEligibleMemberIds(supabase);
  } catch (err) {
    console.error("[cron/adapt-program-daily] loadEligibleMemberIds:", err);
    return new NextResponse("query failed", { status: 500 });
  }

  if (memberIds.length === 0) {
    const body = {
      ok: true,
      eligible: 0,
      processed: 0,
      skipped_no_session: 0,
      skipped_no_action: 0,
      skipped_duplicate: 0,
      persisted: 0,
      escalated: 0,
      refined: 0,
      failed: 0,
    };
    await recordWatchedCronRun(supabase, "adapt-program-daily", body);
    return NextResponse.json(body);
  }

  let processed = 0;
  let skippedNoSession = 0;
  let skippedNoAction = 0;
  let skippedDuplicate = 0;
  let persisted = 0;
  let escalated = 0;
  let refined = 0;
  let failed = 0;

  for (const memberId of memberIds) {
    processed += 1;
    try {
      // 1. Build the engine input snapshot.
      const input = await buildEngineInput(supabase, memberId, now);
      if (!input) {
        // No upcoming session within the 2-day horizon — silent skip.
        skippedNoSession += 1;
        continue;
      }

      // 2. Run the rule layer.
      const decision = evaluateAdaptation(input);
      if (decision.action === "no_change") {
        // Rule layer says no action — don't persist, don't ask Claude.
        skippedNoAction += 1;
        continue;
      }

      // 3. Optionally refine with Claude. Null on any failure → fall
      //    back to the rule decision verbatim.
      //
      // Dynamic import (rather than top-of-file static) mirrors the
      // working pattern in src/lib/data/program-generator.ts. When
      // imported statically into a route handler that exports
      // runtime="nodejs", Turbopack bundles
      // @anthropic-ai/sdk/helpers/zod in a way that causes
      // messages.parse to silently return parsed_output:null. Deferring
      // the import to call-site keeps the SDK on its happy path.
      // Investigation: docs/superpowers/specs/2026-05-26-adaptive-reasoning-fallback-investigation.md
      const { refineWithClaude } = await import(
        "@/lib/adaptive/reasoning-claude"
      );
      const refinement = await refineWithClaude(decision, input);
      if (refinement) refined += 1;

      // 4. Persist.
      const result = await persistAdaptation({
        supabase,
        decision,
        input,
        context: {
          memberId,
          sessionId: input.nextSession!.sessionId,
          programId: null,
        },
        refinement,
        now,
      });

      if (result.skipped) {
        if (result.reason === "duplicate") skippedDuplicate += 1;
        else skippedNoAction += 1;
        continue;
      }
      persisted += 1;
      if (result.alertId) escalated += 1;
    } catch (err) {
      failed += 1;
      console.error(
        `[cron/adapt-program-daily] member ${memberId} failed:`,
        err
      );
    }
  }

  const body = {
    ok: true,
    eligible: memberIds.length,
    processed,
    skipped_no_session: skippedNoSession,
    skipped_no_action: skippedNoAction,
    skipped_duplicate: skippedDuplicate,
    persisted,
    escalated,
    refined,
    failed,
  };
  await recordWatchedCronRun(supabase, "adapt-program-daily", body);
  return NextResponse.json(body);
}
