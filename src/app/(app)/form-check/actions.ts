"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { getSession } from "@/lib/auth";
import { getFormCheckQuota } from "@/lib/data/form-check-quota-server";
import type {
  AIVerdict,
  ExerciseCoachingContext,
} from "@/lib/data/form-check-claude";

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
export type AnalyzeFormCheckResult = {
  ok: boolean;
  verdict: AIVerdict | null;
  formCheckId: string | null;
  /** Set when the member has used their full monthly quota. */
  quotaExceeded?: boolean;
  /** Tier-based limit, returned so the UI can render the upgrade CTA. */
  quotaLimit?: number;
};

export async function analyzeFormCheckAction(input: {
  frames: string[];
  exerciseName?: string;
  exerciseId?: string;
  context?: ExerciseCoachingContext;
}): Promise<AnalyzeFormCheckResult> {
  if (!input.frames || input.frames.length === 0) {
    return { ok: false, verdict: null, formCheckId: null };
  }

  // Tier quota — enforced server-side as defense-in-depth even though
  // the UI also gates the upload button. Skipped in demo mode (no
  // session, no DB) so local dev keeps working.
  if (SUPABASE_ENABLED) {
    const member = await getSession();
    if (member) {
      const quota = await getFormCheckQuota(member.id, member.tier);
      if (!quota.hasRemaining) {
        return {
          ok: false,
          verdict: null,
          formCheckId: null,
          quotaExceeded: true,
          quotaLimit: quota.limit,
        };
      }
    }
  }

  // Cap at 4 frames — payload safety + cost cap.
  const frames = input.frames.slice(0, 4);

  let verdict: AIVerdict | null = null;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const { analyzeWithClaude } = await import(
        "@/lib/data/form-check-claude"
      );
      verdict = await analyzeWithClaude(
        frames,
        input.exerciseName,
        input.context,
      );
    } catch (err) {
      console.warn("[form-check-action] Claude path failed:", err);
    }
  }

  if (!verdict) {
    return { ok: false, verdict: null, formCheckId: null };
  }

  let formCheckId: string | null = null;

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
          const { data } = await supabase
            .from("form_checks")
            .insert({
              member_id: user.id,
              exercise_id: input.exerciseId ?? null,
              exercise_name: input.exerciseName ?? verdict.detectedExercise,
              video_url: null, // attached separately once upload completes
              ai_score: verdict.score,
              ai_headline: verdict.headline,
              ai_pos: verdict.pos,
              ai_neg: verdict.neg,
              ai_fix: verdict.fix,
            })
            .select("id")
            .single();
          formCheckId = data?.id ?? null;
          revalidatePath("/coach");
          revalidatePath("/coach/queue");
        }
      }
    } catch (err) {
      console.warn("[form-check-action] DB persist failed (non-fatal):", err);
    }
  }

  return { ok: true, verdict, formCheckId };
}

/**
 * Attach the uploaded video's storage path to a form-check row. Called
 * after the parallel browser-side upload to Supabase Storage finishes.
 * No-op when Supabase isn't configured.
 */
export async function attachFormCheckVideoAction(input: {
  formCheckId: string;
  videoPath: string;
}): Promise<{ ok: boolean }> {
  if (!SUPABASE_ENABLED) return { ok: true };

  const supabase = await createClient();
  if (!supabase) return { ok: false };

  const { error } = await supabase
    .from("form_checks")
    .update({ video_url: input.videoPath })
    .eq("id", input.formCheckId);

  if (error) {
    console.warn("[form-check-action] attach video failed:", error.message);
    return { ok: false };
  }

  revalidatePath("/coach");
  revalidatePath("/coach/queue");
  return { ok: true };
}
