/**
 * Adaptive Program Engine — pure reasoning helpers + Claude prompt.
 *
 * Spec: docs/superpowers/specs/2026-05-25-adaptive-program-engine-v0-design.md §7
 *
 * This module is pure: no DB, no LLM, no `server-only`. The async
 * wrapper that actually calls Claude lives in `reasoning-claude.ts`
 * (mirrors the split between `insights.ts` and `insights-claude.ts`).
 *
 * What lives here:
 *   - `AdaptationDecisionSchema` — Zod output schema the LLM must conform to
 *   - `SYSTEM_PROMPT` — frozen cacheable prefix
 *   - `buildUserPayload` — deterministic JSON of rule decision + member snapshot
 *   - `mapToRefinement` — converts LLM output to internal ReasoningRefinement
 *
 * Keeping these pure means tests run in Node without server-only friction
 * and replay/debugging tools can build the same payloads off-platform.
 */

import { z } from "zod";

import type { Json } from "@/lib/supabase/database.types";

import type { ReasoningRefinement } from "./persist";
import type {
  AdaptiveActionParams,
  CandidateDecision,
  EngineInput,
} from "./types";

/* ---------------------------------------------------------------- *
 * Output schema (Zod)
 * ---------------------------------------------------------------- */

const ActionEnum = z.enum([
  "no_change",
  "top_set_reduction",
  "volume_reduction",
  "paused_session",
  "deload_week_insertion",
  "exercise_swap_variant",
  "session_shorten",
  "escalate_to_coach",
]);

const ActionParamsSchema = z
  .object({
    percent: z.number().min(0).max(100).optional(),
    accessory_sets_dropped: z.number().int().min(0).max(10).optional(),
    from_exercise_id: z.string().optional(),
    to_exercise_id: z.string().optional(),
    variant_reason: z
      .enum(["joint_friendly", "unilateral", "low_cns", "time_efficient"])
      .optional(),
  })
  .optional();

export const AdaptationDecisionSchema = z.object({
  final_action: ActionEnum,
  action_params: ActionParamsSchema,
  explanation_da: z.string().min(10).max(280),
  // Capped at 0.95 — high-confidence rule outcomes (sick marker, very_low)
  // reserve >0.95 for themselves.
  confidence: z.number().min(0).max(0.95),
  human_review_recommended: z.boolean(),
  reasons_used: z.array(z.string()).max(5),
});

export type AdaptationDecisionOutput = z.infer<typeof AdaptationDecisionSchema>;

/* ---------------------------------------------------------------- *
 * System prompt (frozen — cacheable prefix)
 *
 * Stable across all members. Changing this prompt invalidates the
 * cache for the next ~5 min window; rotate only when intentionally
 * retraining (e.g. weekly Munk few-shot refresh).
 * ---------------------------------------------------------------- */

export const SYSTEM_PROMPT = `Du er Munks assistent for MakeIt // HQ — en dansk styrketrænings-platform.

Din opgave er at REFINE et forslag fra den deterministiske rule-layer.
Rule-layeren har allerede valgt en action og en confidence baseret på
HRV, livsstil, sidste session og form-checks. Du ser dens beslutning
sammen med medlemmets snapshot, og du må:

- Bekræfte rule-layerens valg (mest almindeligt — rule-layeren har ret 80% af tiden)
- Downgrade hvis konteksten antyder rule-layeren var for ivrig
- Forbedre den danske forklaring så den lyder som Munk, ikke som en algoritme
- Vælge mere præcise params (fx percent: 15 i stedet for 10 hvis signalerne er stærkere)
- Sætte human_review_recommended=true hvis du er usikker — selv for actions der normalt ikke eskalerer

Du må IKKE:
- Opfinde nye action-typer udover de 8 i kataloget
- Ændre program-strukturen ud over hvad action'en tillader (du må ikke fx tilføje øvelser)
- Sætte confidence > 0.95 (det reserveres til deterministiske rule-cases)
- Bruge medicinsk sprog eller skræmme medlemmet

# Action-katalog (8 typer)

| Action | Hvornår | Params |
|---|---|---|
| no_change | Alt ser fint ud, eller rule-layeren er for ivrig | (ingen) |
| top_set_reduction | HRV lav + livsstilsfaktor (søvn/alkohol/feeling) | { percent: 5/10/15 } |
| volume_reduction | HRV lav alene, eller missed sessions | { accessory_sets_dropped: 1/2/3 } |
| paused_session | HRV meget lav, syg, eller akut behov for restitution | (ingen) — eskalerer altid |
| deload_week_insertion | Vedvarende lav HRV (≥3 af sidste 5 dage) eller RPE-drift ≥1.5 | (ingen) — eskalerer altid |
| exercise_swap_variant | HRV lav + dårligt form-check på hovedløft + lettere variant findes | { from_exercise_id, to_exercise_id, variant_reason } |
| session_shorten | Begrænset tid eller missed sessions + RPE overshoot | (ingen) |
| escalate_to_coach | Usædvanlig kombination eller du er usikker | (ingen) — eskalerer altid |

# Brand voice (forklaring)

- Direkte og dansk. Ingen jargon, ingen entusiastiske emojis.
- Skriv som om Munk havde sendt sms'en. 1-2 sætninger. Max 280 tegn.
- Cite konkret hvad der drev valget ("Din HRV er lav i dag og sidste squat-form var 7/10").
- Slut med hvad medlemmet skal gøre eller forvente, ikke en floskel.

# Forklarings-eksempler (god stil)

- "Din HRV er lav i dag, og du sov 5t14m. Vi har trukket topsæt-vægten 10% ned. Arbejdssæt er uændret."
- "Sidste session var hårdere end planlagt og du har misset to dage — accessory-blokken er markeret som valgfri."
- "Du har markeret dig som syg. Dagens session er erstattet med 10 min mobilitet + gåtur. Munk får besked."

# Forklarings-eksempler (DÅRLIG stil — gør ikke det her)

- "Din krop er ude af balance og har brug for restitution." (vagt, medicinsk-agtigt)
- "🔥 Lad os tage dagen med ro 🔥" (emojis, infantiliserende)
- "Din HRV viser et 6% fald i den vagale tonus, hvilket indikerer..." (jargon)
- "Hold ud, du klarer det!" (floskel)

# reasons_used

Liste af 1-5 stabile reason codes du brugte. Brug snake_case fra rule-layerens
katalog (hrv_low, low_sleep, recent_alcohol, low_feeling, rpe_overshoot,
rpe_drift_rising, missed_sessions, sustained_low_readiness, form_check_concern,
time_constraint, sick_marker, hrv_very_low, unusual_signal_combination).

# Output

Du skal kalde submit_decision tool'et med en struktureret payload.
Skriv ALDRIG prosa-svar. Validering er striks.`;

/* ---------------------------------------------------------------- *
 * Pure helpers
 * ---------------------------------------------------------------- */

/**
 * Build the user-message payload from the rule decision + member snapshot.
 *
 * Returns a deterministic JSON string. Cache hits on the system prefix
 * give us ~0.1× cost; we keep the user payload structured + minimal so
 * the same input produces the same payload byte-for-byte across runs
 * (useful for replay/debugging — not for cache hits, which are
 * system-prompt-scoped).
 */
export function buildUserPayload(
  decision: CandidateDecision,
  input: EngineInput
): string {
  const payload = {
    rule_decision: {
      action: decision.action,
      confidence: decision.confidence,
      reasons: decision.reasons,
      params: decision.params,
      human_review_recommended: decision.humanReviewRecommended,
    },
    member_snapshot: {
      reading: input.latestReading
        ? {
            measured_at: input.latestReading.measuredAt,
            readiness_bucket: input.latestReading.readinessBucket,
            warm_up_state: input.latestReading.warmUpState,
            is_sick: input.latestReading.isSick,
          }
        : null,
      very_low_days_last_5: input.veryLowDaysLast5,
      rpe_drift_last_14d: input.rpeDriftLast14d,
      lifestyle: {
        sleep_hours_avg_2d: input.lifestyle.sleepHoursAvg2d,
        alcohol_last_2d: input.lifestyle.alcoholLast2d,
        feeling_last_3d: input.lifestyle.feelingLast3d,
      },
      last_session_rpe: input.recentSessions.length
        ? {
            top_set_rpe_avg:
              input.recentSessions[input.recentSessions.length - 1].topSetRpeAvg,
            top_set_target_rpe_avg:
              input.recentSessions[input.recentSessions.length - 1]
                .topSetTargetRpeAvg,
          }
        : null,
      missed_sessions_in_last_3: input.recentSessions.filter(
        (s) => s.status === "skipped"
      ).length,
      days_since_heavy_lift: input.daysSinceHeavyLift,
      main_lift_recent_form_check: pickMainLiftFormCheckSummary(input),
    },
    next_session: input.nextSession
      ? {
          title: input.nextSession.title,
          week: input.nextSession.week,
          main_lift:
            input.nextSession.exercises.find((e) => e.position === 1) ?? null,
        }
      : null,
  };
  return JSON.stringify(payload, null, 2);
}

function pickMainLiftFormCheckSummary(input: EngineInput) {
  if (!input.nextSession) return null;
  const mainLift = input.nextSession.exercises.find((e) => e.position === 1);
  if (!mainLift) return null;
  const matches = input.recentFormChecks
    .filter((fc) => fc.exerciseId === mainLift.exerciseId)
    .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));
  if (matches.length === 0) return null;
  return {
    exercise_name: mainLift.exerciseName,
    score: matches[0].score,
    reviewed_at: matches[0].reviewedAt,
  };
}

/**
 * Map the LLM's snake_case AdaptationDecisionOutput into our internal
 * camelCase ReasoningRefinement shape. Snaps numeric params to the
 * allowed value set (percent ∈ {5,10,15}, accessorySetsDropped ∈ {1,2,3}).
 *
 * Returns null when the output is structurally valid but semantically
 * unusable (e.g. exercise_swap_variant without from/to ids) — caller
 * then falls back to the rule layer's decision verbatim.
 */
export function mapToRefinement(
  raw: AdaptationDecisionOutput
): ReasoningRefinement | null {
  const params: AdaptiveActionParams = {};
  if (raw.action_params) {
    if (raw.action_params.percent !== undefined) {
      const snapped = snapPercent(raw.action_params.percent);
      if (snapped !== null) params.percent = snapped;
    }
    if (raw.action_params.accessory_sets_dropped !== undefined) {
      const snapped = snapAccessorySets(
        raw.action_params.accessory_sets_dropped
      );
      if (snapped !== null) params.accessorySetsDropped = snapped;
    }
    if (raw.action_params.from_exercise_id) {
      params.fromExerciseId = raw.action_params.from_exercise_id;
    }
    if (raw.action_params.to_exercise_id) {
      params.toExerciseId = raw.action_params.to_exercise_id;
    }
    if (raw.action_params.variant_reason) {
      params.variantReason = raw.action_params.variant_reason;
    }
  }

  // Semantic guard: exercise_swap_variant requires both ids.
  if (raw.final_action === "exercise_swap_variant") {
    if (!params.fromExerciseId || !params.toExerciseId) {
      return null;
    }
  }

  return {
    rawOutput: raw as unknown as Json,
    explanationDa: raw.explanation_da,
    confidence: raw.confidence,
    humanReviewRecommended: raw.human_review_recommended,
    paramsOverride: params,
  };
}

function snapPercent(n: number): 5 | 10 | 15 | null {
  if (n <= 7.5) return 5;
  if (n < 12.5) return 10;
  if (n <= 20) return 15;
  return null;
}

function snapAccessorySets(n: number): 1 | 2 | 3 | null {
  const rounded = Math.round(n);
  if (rounded === 1 || rounded === 2 || rounded === 3) return rounded;
  if (rounded > 3) return 3;
  return null;
}
