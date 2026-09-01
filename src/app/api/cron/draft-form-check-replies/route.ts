import { NextResponse, type NextRequest } from "next/server";

import {
  pickVoiceSamples,
  type FormCheckContext,
  type VoiceSample,
  type VoiceTone,
} from "@/lib/coach/draft-reply";
import { assertCronAuth } from "@/lib/cron/auth";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Munk Multiplier — draft form-check replies cron (MM-5).
 *
 * Spec: docs/superpowers/specs/2026-05-26-munk-multiplier-v0-design.md §3 (MM-2 surface), §6
 *
 * Schedule: every 30 min. Scans form_checks awaiting coach review
 * that don't yet have an AI-drafted reply, and pre-stages a draft in
 * Munk's voice so the review modal opens with zero wait.
 *
 * For each pending form-check:
 *   1. Build a FormCheckContext from the row's AI analysis.
 *   2. Call generateDraftReply (dynamic-imported — keeps Turbopack on
 *      its happy path, matching program-generator / the adaptive
 *      reasoning fix).
 *   3. Persist ai_drafted_reply + ai_drafted_reply_at.
 *
 * Voice samples are picked ONCE per batch and reused for every
 * form-check, so the cached system prefix hits after the first call.
 *
 * Per-row try/catch keeps one failure from aborting the batch.
 * Returns a JSON summary for the ops view.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const unauthorized = assertCronAuth(request);
  if (unauthorized) return unauthorized;

  const supabase = createServiceClient();

  // --- Voice pool, picked once per batch (cache-stable prefix). ---
  const { data: voiceRows, error: voiceErr } = await supabase
    .from("coach_voice_samples")
    .select("reply_text, tone");
  if (voiceErr) {
    console.error("[cron/draft-form-check-replies] voice samples:", voiceErr.message);
    return new NextResponse("query failed", { status: 500 });
  }
  const pool: VoiceSample[] = (voiceRows ?? []).map((r) => ({
    replyText: r.reply_text as string,
    tone: r.tone as VoiceTone,
  }));
  const batchSamples = pickVoiceSamples(pool, 3);

  // --- Pending form-checks: reviewed=null, no draft yet, has AI
  //     analysis to work from. Cap the batch so one cron tick can't
  //     run unbounded. ---
  const { data: pending, error: pendingErr } = await supabase
    .from("form_checks")
    .select(
      "id, exercise_name, ai_score, ai_headline, ai_pos, ai_neg, ai_fix"
    )
    .is("coach_reviewed_at", null)
    .is("ai_drafted_reply", null)
    .not("ai_score", "is", null)
    .order("created_at", { ascending: true })
    .limit(20);
  if (pendingErr) {
    console.error("[cron/draft-form-check-replies] pending:", pendingErr.message);
    return new NextResponse("query failed", { status: 500 });
  }

  const rows = pending ?? [];
  let processed = 0;
  let drafted = 0;
  let skippedNoDraft = 0;
  let failed = 0;

  // Lazy-load the Claude wrapper once — dynamic import keeps the
  // @anthropic-ai/sdk/helpers/zod bundling on its happy path in the
  // route handler (see the adaptive reasoning investigation note).
  const { generateDraftReply } = await import(
    "@/lib/coach/draft-reply-claude"
  );

  for (const row of rows) {
    processed += 1;
    try {
      const ctx: FormCheckContext = {
        exerciseName: (row.exercise_name as string | null) ?? "øvelsen",
        aiScore: (row.ai_score as number | null) ?? null,
        aiHeadline: (row.ai_headline as string | null) ?? null,
        aiPos: Array.isArray(row.ai_pos) ? (row.ai_pos as string[]) : [],
        aiNeg: Array.isArray(row.ai_neg) ? (row.ai_neg as string[]) : [],
        aiFix: (row.ai_fix as string | null) ?? null,
      };

      const draft = await generateDraftReply({
        formCheck: ctx,
        voiceSamples: batchSamples,
      });
      if (!draft) {
        // Null = no key / API error / unusable output. Munk writes
        // from scratch; we don't stamp ai_drafted_reply so the next
        // tick retries.
        skippedNoDraft += 1;
        continue;
      }

      const { error: updErr } = await supabase
        .from("form_checks")
        .update({
          ai_drafted_reply: draft.replyDa,
          ai_drafted_reply_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        // Guard against a coach reviewing between our read and write.
        .is("coach_reviewed_at", null);
      if (updErr) throw new Error(`update: ${updErr.message}`);
      drafted += 1;
    } catch (err) {
      failed += 1;
      console.error(
        `[cron/draft-form-check-replies] form_check ${row.id} failed:`,
        err
      );
    }
  }

  return NextResponse.json({
    ok: true,
    voice_pool: pool.length,
    samples_used: batchSamples.length,
    pending: rows.length,
    processed,
    drafted,
    skipped_no_draft: skippedNoDraft,
    failed,
  });
}
