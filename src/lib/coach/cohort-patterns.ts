/**
 * Munk Multiplier — cohort-pattern detectors (MM-3).
 *
 * Spec: docs/superpowers/specs/2026-05-26-munk-multiplier-v0-design.md §3 (MM-3)
 *
 * Pure: no DB, no React. The cron (MM-7) fetches + shapes the inputs;
 * these detectors find cross-member signals the engine sees but Munk
 * couldn't easily spot by hand. Output feeds straight into the morning
 * report's `patterns` block (MM-2's CohortPattern[]).
 *
 * Four detectors:
 *   1. hrv_cluster_day        — ≥3 members hit very_low the same day
 *   2. rpe_drift_program_week — same (programCode, week) cohort with
 *                               median RPE-drift ≥1.5 (programming smell)
 *   3. engine_reject_streak   — members who kept-original ≥2× in a row
 *   4. form_check_decline     — members whose ai_score dropped >15%
 *                               over their last 3 lifts on one exercise
 *
 * Each returns CohortPattern[] (possibly empty). detectCohortPatterns
 * runs all four and concatenates.
 */

import type { ReadinessBucket } from "@/lib/hrv/types";
import type { CohortPattern } from "./types";

/* ---------------- thresholds (one place to tune) ---------------- */
const HRV_CLUSTER_MIN_MEMBERS = 3;
const RPE_DRIFT_THRESHOLD = 1.5;
const RPE_DRIFT_MIN_MEMBERS = 2;
const REJECT_STREAK_MIN = 2;
const FORM_CHECK_DECLINE_PCT = 0.15;
const FORM_CHECK_MIN_SAMPLES = 3;

/* ================================================================== *
 * Input shapes (camelCase, fed by the cron)
 * ================================================================== */

export interface HrvReadinessDay {
  memberId: string;
  handle: string;
  /** ISO date YYYY-MM-DD of the reading. */
  date: string;
  readinessBucket: ReadinessBucket | null;
}

export interface ProgramWeekRpe {
  memberId: string;
  programCode: string;
  week: number;
  /** Member's mean (logged − target) RPE drift over the window. */
  rpeDrift: number;
}

export interface MemberModifierHistory {
  memberId: string;
  handle: string;
  /** Recent adaptive_v0 modifiers, oldest first. */
  modifiers: { createdAt: string; acceptedByMember: boolean | null }[];
}

export interface MemberFormCheckHistory {
  memberId: string;
  handle: string;
  exerciseId: string;
  exerciseName: string;
  /** Recent ai_scores for this exercise, oldest first. */
  scores: { score: number; reviewedAt: string }[];
}

export interface CohortPatternInputs {
  hrvReadinessDays: HrvReadinessDay[];
  /** Total active members — for the "N af M" phrasing. */
  cohortSize: number;
  programWeekRpe: ProgramWeekRpe[];
  memberModifierHistories: MemberModifierHistory[];
  memberFormCheckHistories: MemberFormCheckHistory[];
}

/* ================================================================== *
 * Helpers
 * ================================================================== */

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function formatDanishDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

/* ================================================================== *
 * Detector 1 — hrv_cluster_day
 * ================================================================== */

export function detectHrvClusterDays(
  rows: HrvReadinessDay[],
  cohortSize: number
): CohortPattern[] {
  // Group very_low readings by date.
  const byDate = new Map<string, HrvReadinessDay[]>();
  for (const r of rows) {
    if (r.readinessBucket !== "very_low") continue;
    const arr = byDate.get(r.date) ?? [];
    arr.push(r);
    byDate.set(r.date, arr);
  }

  const patterns: CohortPattern[] = [];
  // Newest day first for display.
  const dates = [...byDate.keys()].sort((a, b) => b.localeCompare(a));
  for (const date of dates) {
    const members = byDate.get(date)!;
    // De-dupe members (a member could have multiple very_low readings
    // logged on one date).
    const uniqueIds = [...new Set(members.map((m) => m.memberId))];
    if (uniqueIds.length < HRV_CLUSTER_MIN_MEMBERS) continue;
    const ofText = cohortSize > 0 ? ` af ${cohortSize}` : "";
    patterns.push({
      code: "hrv_cluster_day",
      summaryDa: `${uniqueIds.length}${ofText} medlemmer ramte very_low d. ${formatDanishDate(date)} — fælles ydre årsag?`,
      affectedMemberIds: uniqueIds,
    });
  }
  return patterns;
}

/* ================================================================== *
 * Detector 2 — rpe_drift_program_week
 * ================================================================== */

export function detectRpeDriftProgramWeeks(
  rows: ProgramWeekRpe[]
): CohortPattern[] {
  // Group by (programCode, week).
  const byGroup = new Map<string, ProgramWeekRpe[]>();
  for (const r of rows) {
    const key = `${r.programCode}::${r.week}`;
    const arr = byGroup.get(key) ?? [];
    arr.push(r);
    byGroup.set(key, arr);
  }

  const patterns: CohortPattern[] = [];
  for (const [key, group] of byGroup) {
    if (group.length < RPE_DRIFT_MIN_MEMBERS) continue;
    const med = median(group.map((g) => g.rpeDrift));
    if (med < RPE_DRIFT_THRESHOLD) continue;
    const [programCode, week] = key.split("::");
    patterns.push({
      code: "rpe_drift_program_week",
      summaryDa: `${programCode} uge ${week}: median RPE-drift +${med.toFixed(1)} over ${group.length} medlemmer — programmerings-issue?`,
      affectedMemberIds: group.map((g) => g.memberId),
    });
  }
  return patterns;
}

/* ================================================================== *
 * Detector 3 — engine_reject_streak
 * ================================================================== */

export function detectEngineRejectStreaks(
  histories: MemberModifierHistory[]
): CohortPattern[] {
  const affected: { memberId: string; handle: string }[] = [];
  for (const h of histories) {
    // Longest trailing run of accepted_by_member === false.
    let trailingStreak = 0;
    for (let i = h.modifiers.length - 1; i >= 0; i--) {
      if (h.modifiers[i].acceptedByMember === false) trailingStreak += 1;
      else break;
    }
    if (trailingStreak >= REJECT_STREAK_MIN) {
      affected.push({ memberId: h.memberId, handle: h.handle });
    }
  }
  if (affected.length === 0) return [];
  return [
    {
      code: "engine_reject_streak",
      summaryDa: `${affected.length} ${affected.length === 1 ? "medlem har" : "medlemmer har"} afvist ≥${REJECT_STREAK_MIN} tilpasninger i træk — motoren måske for ivrig for dem.`,
      affectedMemberIds: affected.map((a) => a.memberId),
    },
  ];
}

/* ================================================================== *
 * Detector 4 — form_check_decline
 * ================================================================== */

export function detectFormCheckDeclines(
  histories: MemberFormCheckHistory[]
): CohortPattern[] {
  const affected: string[] = [];
  for (const h of histories) {
    if (h.scores.length < FORM_CHECK_MIN_SAMPLES) continue;
    // Compare the most recent score against the oldest in the window.
    const recent = h.scores.slice(-FORM_CHECK_MIN_SAMPLES);
    const oldest = recent[0].score;
    const newest = recent[recent.length - 1].score;
    if (oldest <= 0) continue;
    // Round to 4 decimals before comparing so float noise at the
    // threshold (e.g. (8-6.8)/8 = 0.15000000000000002) doesn't cause
    // spurious flags right at the boundary.
    const dropPct = Math.round(((oldest - newest) / oldest) * 10000) / 10000;
    if (dropPct > FORM_CHECK_DECLINE_PCT) {
      affected.push(h.memberId);
    }
  }
  if (affected.length === 0) return [];
  const unique = [...new Set(affected)];
  return [
    {
      code: "form_check_decline",
      summaryDa: `${unique.length} ${unique.length === 1 ? "medlem" : "medlemmer"} med faldende form-check-score (>${Math.round(FORM_CHECK_DECLINE_PCT * 100)}% over seneste ${FORM_CHECK_MIN_SAMPLES} løft).`,
      affectedMemberIds: unique,
    },
  ];
}

/* ================================================================== *
 * Orchestrator
 * ================================================================== */

/**
 * Run all four detectors and concatenate their patterns. Order is
 * stable (cluster → rpe → reject → form-check) so the morning report
 * renders consistently day to day.
 */
export function detectCohortPatterns(
  inputs: CohortPatternInputs
): CohortPattern[] {
  return [
    ...detectHrvClusterDays(inputs.hrvReadinessDays, inputs.cohortSize),
    ...detectRpeDriftProgramWeeks(inputs.programWeekRpe),
    ...detectEngineRejectStreaks(inputs.memberModifierHistories),
    ...detectFormCheckDeclines(inputs.memberFormCheckHistories),
  ];
}
