"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import {
  computeAgreementScore,
  deriveMunkDecisionFromAlert,
  isCoachDecision,
  type CoachDecision,
} from "@/lib/coach-school/agreement";
import { pickMembersForCoCoach } from "@/lib/coach-school/assignment";

/**
 * CC-4 — submit one sandbox review on an hrv_alert.
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §7
 *
 * Beast picks a decision (approve/modify/escalate/reject) and optional
 * reasoning. We derive Munk's actual decision from the alert status,
 * compute an agreement score against it, and insert a coach_reviews
 * row. The score + Munk's decision come back in the response so the
 * UI can reveal the comparison side-by-side.
 *
 * RLS: coach_reviews_own_insert (migration 0045) accepts the insert
 * when reviewer_id = auth.uid(). Reading hrv_alerts to derive Munk's
 * decision goes through coach_manages_alerts (is_current_user_coach())
 * — sandbox/live coaches must have is_coach=true alongside coach_tier.
 */
export interface SandboxSubmitResult {
  ok: boolean;
  reason?: string;
  agreementScore?: number;
  munkDecision?: CoachDecision;
}

export async function submitSandboxReviewAction(input: {
  alertId: string;
  decision: string;
  reasoning?: string | null;
}): Promise<SandboxSubmitResult> {
  if (!isCoachDecision(input.decision)) {
    return { ok: false, reason: "invalid-decision" };
  }
  const beastDecision: CoachDecision = input.decision;

  if (!SUPABASE_ENABLED) {
    // Demo mode: optimistic path. The page rendered against MOCK_CASES,
    // so callers handle the "what Munk decided" reveal client-side.
    return { ok: true, agreementScore: 1.0, munkDecision: beastDecision };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "no-supabase" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const { data: alert, error: alertErr } = await supabase
    .from("hrv_alerts")
    .select("status")
    .eq("id", input.alertId)
    .single();
  if (alertErr || !alert) return { ok: false, reason: "alert-not-found" };

  const munkDecision = deriveMunkDecisionFromAlert(alert.status as string);
  if (!munkDecision) return { ok: false, reason: "alert-not-decided" };

  const agreementScore = computeAgreementScore(beastDecision, munkDecision);
  const reasoning =
    (input.reasoning ?? "").slice(0, 1000).trim() || null;

  const { error: insErr } = await supabase
    .from("coach_reviews")
    .insert({
      reviewer_id: user.id,
      mode: "sandbox",
      source_type: "hrv_alert",
      source_id: input.alertId,
      decision: beastDecision,
      reasoning,
      munk_decision: munkDecision,
      agreement_score: agreementScore,
    });
  if (insErr) {
    console.warn("[coach-school] sandbox review insert failed:", insErr.message);
    return { ok: false, reason: "insert-failed" };
  }

  revalidatePath("/coach-school/sandbox");
  return { ok: true, agreementScore, munkDecision };
}

/**
 * CC-5 — Munk-only "Promote to live" action.
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §7
 *
 * Flips a Beast from coach_tier='beast_sandbox' to 'beast_live' and
 * auto-creates up to 3 co_coach_assignments via the pure picker.
 *
 * Guards:
 *   - The caller must be Munk (coach_tier='munk'). Privileged role check
 *     happens against the service-role client; the caller's identity is
 *     resolved through the cookie-aware client first.
 *   - The Beast must currently be in 'beast_sandbox' — promoting an
 *     already-live or non-sandbox member is rejected so accidental
 *     double-promotions are explicit (caller sees the reason).
 *
 * v0 assignment is random-but-deterministic (see pickMembersForCoCoach
 * jsdoc). Complementarity-scored picks ship in CC-5b.
 */
export interface PromoteToLiveResult {
  ok: boolean;
  reason?: string;
  /** member_ids the freshly-promoted co-coach is now assigned to review. */
  assignedMemberIds?: string[];
}

const PROMOTE_PICK_COUNT = 3;

export async function promoteToLiveAction(input: {
  beastMemberId: string;
}): Promise<PromoteToLiveResult> {
  if (!SUPABASE_ENABLED) {
    // Demo mode — no-op success so CC-7's surface stays exercisable.
    return { ok: true, assignedMemberIds: [] };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "no-supabase" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  // All privileged reads/writes go through the service-role client —
  // the action mutates members.coach_tier (no member-write RLS) and
  // inserts co_coach_assignments (Munk-only RLS that we verify above).
  const svc = createServiceClient();

  // Caller must be Munk.
  const { data: callerRow, error: callerErr } = await svc
    .from("members")
    .select("coach_tier")
    .eq("id", user.id)
    .single();
  if (callerErr) return { ok: false, reason: "caller-lookup-failed" };
  if (callerRow?.coach_tier !== "munk") {
    return { ok: false, reason: "not-munk" };
  }

  // Beast must currently be in sandbox.
  const { data: beastRow, error: beastErr } = await svc
    .from("members")
    .select("coach_tier")
    .eq("id", input.beastMemberId)
    .single();
  if (beastErr || !beastRow) return { ok: false, reason: "beast-not-found" };
  if (beastRow.coach_tier !== "beast_sandbox") {
    return { ok: false, reason: "beast-not-in-sandbox" };
  }

  // Roster of candidate assigned members + active assignments.
  const [rosterRes, activeRes] = await Promise.all([
    svc.from("members").select("id").eq("is_coach", false),
    svc.from("co_coach_assignments").select("assigned_member_id").is("ended_at", null),
  ]);
  if (rosterRes.error) return { ok: false, reason: "roster-lookup-failed" };
  if (activeRes.error) return { ok: false, reason: "assignments-lookup-failed" };

  const roster = (rosterRes.data ?? []).map((r) => r.id as string);
  const alreadyAssigned = new Set(
    (activeRes.data ?? []).map((r) => r.assigned_member_id as string),
  );
  const picks = pickMembersForCoCoach({
    roster,
    beastId: input.beastMemberId,
    alreadyAssigned,
    count: PROMOTE_PICK_COUNT,
  });

  // Promote first so a partial assignment-insert below still leaves the
  // tier flipped (CC-7 surface will show "live but no assignments yet"
  // — easier to recover than the inverse).
  const { error: tierErr } = await svc
    .from("members")
    .update({ coach_tier: "beast_live" })
    .eq("id", input.beastMemberId);
  if (tierErr) return { ok: false, reason: "tier-update-failed" };

  if (picks.length > 0) {
    const { error: insErr } = await svc.from("co_coach_assignments").insert(
      picks.map((memberId) => ({
        coach_member_id: input.beastMemberId,
        assigned_member_id: memberId,
        assigned_by: user.id,
      })),
    );
    if (insErr) {
      console.warn("[coach-school] assignment insert failed:", insErr.message);
      // Tier already flipped — surface partial state to caller.
      return {
        ok: false,
        reason: "assignment-insert-failed",
        assignedMemberIds: [],
      };
    }
  }

  revalidatePath("/coach/co-coaches");
  revalidatePath("/coach-school/live");
  return { ok: true, assignedMemberIds: picks };
}

/**
 * CC-5 — submit one LIVE review on an hrv_alert (co-coach decides
 * inline; closes the alert).
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §7
 *
 * Co-coach picks a decision; we insert a coach_reviews row with
 * mode='live' (no Munk comparison stored at write-time — quality cron
 * CC-8 spot-checks live decisions) AND update the alert's status so
 * it leaves the queue.
 *
 * Status mapping mirrors the existing hrv_alert review actions:
 *   - approve  → 'reviewed_noted'      (acknowledged, no action)
 *   - modify / escalate / reject → 'reviewed_actioned'   (took action)
 *
 * RLS: coach_reviews insert is gated by reviewer_id = auth.uid().
 * hrv_alerts update relies on the existing coach_manages_alerts policy
 * (is_current_user_coach()) — co-coaches must have is_coach=true
 * alongside coach_tier (set by promoteToLiveAction).
 */
export interface SubmitLiveResult {
  ok: boolean;
  reason?: string;
}

export async function submitLiveReviewAction(input: {
  alertId: string;
  decision: string;
  reasoning?: string | null;
}): Promise<SubmitLiveResult> {
  if (!isCoachDecision(input.decision)) {
    return { ok: false, reason: "invalid-decision" };
  }
  const decision: CoachDecision = input.decision;

  if (!SUPABASE_ENABLED) {
    // Demo mode — optimistic no-op.
    return { ok: true };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "no-supabase" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const reasoning = (input.reasoning ?? "").slice(0, 1000).trim() || null;

  const { error: insErr } = await supabase
    .from("coach_reviews")
    .insert({
      reviewer_id: user.id,
      mode: "live",
      source_type: "hrv_alert",
      source_id: input.alertId,
      decision,
      reasoning,
    });
  if (insErr) {
    console.warn("[coach-school] live review insert failed:", insErr.message);
    return { ok: false, reason: "insert-failed" };
  }

  const nextStatus = decision === "approve" ? "reviewed_noted" : "reviewed_actioned";
  const { error: updErr } = await supabase
    .from("hrv_alerts")
    .update({
      status: nextStatus,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.alertId)
    .eq("status", "open");
  if (updErr) {
    // Review row already inserted — surface partial state so the
    // co-coach knows their call landed even if the queue didn't clear.
    console.warn("[coach-school] live alert close failed:", updErr.message);
    return { ok: false, reason: "alert-close-failed" };
  }

  revalidatePath("/coach-school/live");
  return { ok: true };
}

/**
 * CC-6 — submit a lesson attempt (quiz answers + practice response).
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §8
 *
 * Server re-loads the lesson (quiz with correct_indexes lives there,
 * never trust the client) → grades the quiz → calls the practice-eval
 * Claude wrapper for the free-text response → upserts lesson_progress.
 *
 * Reps award is intentionally deferred to CC-10 (the dedicated Reps-
 * integration phase). On-completion notification + first-attempt-only
 * award land there.
 *
 * The Claude wrapper is dynamic-imported so Turbopack stays on its
 * happy path with the @anthropic-ai/sdk/helpers/zod entrypoint
 * (lesson learned from the adaptive-reasoning rollout).
 */
export interface SubmitLessonResult {
  ok: boolean;
  reason?: string;
  quizScore?: number;
  practiceEvalScore?: "needs_work" | "on_track" | "strong" | null;
  practiceFeedback?: string | null;
}

export async function submitLessonAction(input: {
  slug: string;
  /** Indexes the member picked, one per quiz question. */
  quizAnswers: number[];
  /** Optional — free-text response to the lesson's practice scenario. */
  practiceResponse?: string | null;
}): Promise<SubmitLessonResult> {
  if (!SUPABASE_ENABLED) {
    // Demo mode — optimistic: pretend every quiz answer is correct
    // and the eval is on_track. Lets the page exercise the UI flow.
    return {
      ok: true,
      quizScore: 1.0,
      practiceEvalScore: "on_track",
      practiceFeedback:
        "Demo mode — det ser fint ud. Ægte Claude-eval kører i prod.",
    };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, reason: "no-supabase" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  // Load lesson server-side — quiz correct_indexes + practice rubric
  // must come from DB, never from the client.
  const { data: lessonRow, error: lessonErr } = await supabase
    .from("coaching_lessons")
    .select("id, quiz, practice_scenario")
    .eq("slug", input.slug)
    .single();
  if (lessonErr || !lessonRow) return { ok: false, reason: "lesson-not-found" };

  // Grade the quiz.
  const quiz =
    (lessonRow.quiz as unknown as { correct_index: number }[]) ?? [];
  let correct = 0;
  for (let i = 0; i < quiz.length; i++) {
    if (input.quizAnswers[i] === quiz[i]?.correct_index) correct += 1;
  }
  const quizScore = quiz.length > 0 ? correct / quiz.length : 0;

  // Practice eval — only if the lesson has a scenario and the member wrote something.
  const scenario = lessonRow.practice_scenario as unknown as {
    prompt: string;
    context?: string | null;
    rubric_for_claude: string;
  } | null;
  const trimmedResponse =
    (input.practiceResponse ?? "").slice(0, 1000).trim() || null;

  let practiceEval: {
    score: "needs_work" | "on_track" | "strong";
    feedback_da: string;
    specific_strength?: string;
    specific_improvement?: string;
  } | null = null;
  if (scenario && trimmedResponse) {
    try {
      const { generatePracticeEval } = await import(
        "@/lib/coach-school/practice-eval-claude"
      );
      practiceEval = await generatePracticeEval({
        rubric: scenario.rubric_for_claude,
        scenarioPrompt: scenario.prompt,
        scenarioContext: scenario.context ?? null,
        memberResponse: trimmedResponse,
      });
    } catch (err) {
      console.warn("[coach-school] practice-eval failed:", err);
      practiceEval = null;
    }
  }

  // Upsert lesson_progress — UNIQUE(member_id, lesson_id) means
  // retakes overwrite the prior attempt's row (matches the spec:
  // "lesson can be retaken; only first attempt awards Reps" — the
  // Reps idempotency lives in CC-10's transaction-insert).
  const { error: upsertErr } = await supabase
    .from("lesson_progress")
    .upsert(
      {
        member_id: user.id,
        lesson_id: lessonRow.id,
        quiz_score: quizScore,
        practice_eval: (practiceEval as unknown) as
          | typeof practiceEval
          | null,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "member_id,lesson_id" },
    );
  if (upsertErr) {
    console.warn("[coach-school] lesson_progress upsert failed:", upsertErr.message);
    return { ok: false, reason: "save-failed" };
  }

  revalidatePath("/coach-school");
  revalidatePath(`/coach-school/lessons/${input.slug}`);
  return {
    ok: true,
    quizScore,
    practiceEvalScore: practiceEval?.score ?? null,
    practiceFeedback: practiceEval?.feedback_da ?? null,
  };
}
