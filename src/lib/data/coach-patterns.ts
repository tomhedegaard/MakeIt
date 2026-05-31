/**
 * Munk Multiplier — on-demand cohort patterns for /coach/patterns (MM-8).
 *
 * Spec: docs/superpowers/specs/2026-05-26-munk-multiplier-v0-design.md §3 (MM-3 on-demand), §8
 *
 * Runs the MM-3 cohort detectors against live state with a coach-
 * configurable window (default 30d, also 7d). Resolves affected
 * member handles once so the page renders without per-row queries.
 *
 * Demo-mode fallback: a small MOCK_PATTERNS set so the page is
 * demoable without a backend (matches the MOCK_FORM_CHECKS approach
 * on /coach/queue).
 */
import "server-only";

import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/service";
import { detectCohortPatterns } from "@/lib/coach/cohort-patterns";
import type { CohortPatternCode } from "@/lib/coach/types";
import {
  aggregateCohortPatternInputs,
  loadRoster,
} from "./coach-morning-report";

/** Whitelist of timeframes the page accepts; everything else falls back to 30. */
export const PATTERN_WINDOWS_DAYS = [7, 30] as const;
export type PatternWindowDays = (typeof PATTERN_WINDOWS_DAYS)[number];

/** Parse + clamp the `?days=` search param to a known window. */
export function parseWindowDays(raw: string | undefined): PatternWindowDays {
  const n = raw ? Number(raw) : NaN;
  return (PATTERN_WINDOWS_DAYS as readonly number[]).includes(n)
    ? (n as PatternWindowDays)
    : 30;
}

/** One pattern with handles resolved — what the page actually renders. */
export interface PatternForDisplay {
  code: CohortPatternCode;
  summaryDa: string;
  affected: { memberId: string; handle: string }[];
}

export interface CoachPatternsPageData {
  patterns: PatternForDisplay[];
  windowDays: PatternWindowDays;
  cohortSize: number;
}

/**
 * Demo-mode mocks. Shaped to exercise three of the four detectors so
 * the on-demand page is non-empty without a backend, mirroring the
 * MOCK_FORM_CHECKS mocks added for MM-6.
 */
const MOCK_PATTERNS: PatternForDisplay[] = [
  {
    code: "hrv_cluster_day",
    summaryDa: "3 af 4 medlemmer ramte very_low d. 28. maj — fælles ydre årsag?",
    affected: [
      { memberId: "m-nina", handle: "nina_dl" },
      { memberId: "m-maria", handle: "maria.lift" },
      { memberId: "m-kasper", handle: "kasper_s" },
    ],
  },
  {
    code: "form_check_decline",
    summaryDa: "1 medlem med faldende form-check-score (>15% over seneste 3 løft).",
    affected: [{ memberId: "m-frederik", handle: "frederik" }],
  },
  {
    code: "engine_reject_streak",
    summaryDa: "1 medlem har afvist ≥2 tilpasninger i træk — motoren måske for ivrig for dem.",
    affected: [{ memberId: "m-frederik", handle: "frederik" }],
  },
];

/**
 * Fetch + detect cohort patterns for the on-demand page. Server-only.
 * Uses the service-role client because the patterns surface joins
 * across all members' hrv_readings / hrv_session_modifiers / form_checks
 * — RLS on those tables doesn't uniformly expose cross-member reads
 * via the session client. The coach layout already gates the route.
 */
export async function getCoachPatternsForPage(
  windowDays: PatternWindowDays = 30,
): Promise<CoachPatternsPageData> {
  if (!SUPABASE_ENABLED) {
    return { patterns: MOCK_PATTERNS, windowDays, cohortSize: 4 };
  }

  const svc = createServiceClient();
  const roster = await loadRoster(svc);
  const inputs = await aggregateCohortPatternInputs(svc, { roster, windowDays });
  const detected = detectCohortPatterns(inputs);
  const handleOf = new Map(roster.map((r) => [r.id, r.handle]));

  const patterns: PatternForDisplay[] = detected.map((p) => ({
    code: p.code,
    summaryDa: p.summaryDa,
    affected: [...new Set(p.affectedMemberIds)].map((id) => ({
      memberId: id,
      handle: handleOf.get(id) ?? "—",
    })),
  }));

  return { patterns, windowDays, cohortSize: roster.length };
}
