"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import type { AIVerdict } from "@/lib/data/form-check-claude";

/**
 * Analyse a form-check video by running Claude vision over the
 * extracted keyframes. Persists the verdict in form_checks when
 * Supabase is configured. Returns null when Claude is unavailable
 * (no API key, or call failed) so the UI can fall back to a canned
 * mock verdict — the user never sees an error.
 *
 * Frames are base64 data URLs (data:image/jpeg;base64,...). The
 * client extracts ~3 keyframes from the uploaded video using a
 * canvas-based seek+draw — no server-side ffmpeg required.
 */
export async function analyzeFormCheckAction(input: {
  frames: string[];
  exerciseName?: string;
}): Promise<{ ok: boolean; verdict: AIVerdict | null }> {
  if (!input.frames || input.frames.length === 0) {
    return { ok: false, verdict: null };
  }

  // Cap at 4 frames — payload safety + cost cap.
  const frames = input.frames.slice(0, 4);

  let verdict: AIVerdict | null = null;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const { analyzeWithClaude } = await import(
        "@/lib/data/form-check-claude"
      );
      verdict = await analyzeWithClaude(frames, input.exerciseName);
    } catch (err) {
      console.warn("[form-check-action] Claude path failed:", err);
    }
  }

  if (!verdict) {
    return { ok: false, verdict: null };
  }

  // Persist when Supabase is configured. RLS scopes the insert to the
  // authed member; coach reviewers see it via the additive coach SELECT
  // policy on form_checks.
  if (SUPABASE_ENABLED) {
    try {
      const supabase = await createClient();
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("form_checks").insert({
            member_id: user.id,
            exercise_name: input.exerciseName ?? verdict.detectedExercise,
            video_url: null, // v1: frames sent inline, no storage upload yet
            ai_score: verdict.score,
            ai_headline: verdict.headline,
            ai_pos: verdict.pos,
            ai_neg: verdict.neg,
            ai_fix: verdict.fix,
          });
          // Coach queue refreshes on next visit.
          revalidatePath("/coach");
          revalidatePath("/coach/queue");
        }
      }
    } catch (err) {
      console.warn("[form-check-action] DB persist failed (non-fatal):", err);
    }
  }

  return { ok: true, verdict };
}
