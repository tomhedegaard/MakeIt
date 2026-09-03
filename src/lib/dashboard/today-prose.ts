/**
 * Today prose — pure rank / pick (A3).
 *
 * Spec: docs/superpowers/specs/2026-09-03-dashboard-today-prose.md
 *
 * No DB, no React, no i18n strings. The data composer maps live/demo
 * signals into TodayProseInput; this module emits 1–3 sentence keys.
 * Copy lives in messages/{da,en}/Dashboard.json under todayProse.
 */

import { buildHrvBandView, type QualitativeBand } from "@/lib/hrv/band";
import { demoSteadySeries } from "@/lib/hrv/demo-series";
import { TODAY_SESSION } from "@/lib/workout";

export type TodayProseKey =
  | "hrvLav"
  | "hrvRo"
  | "hrvMidt"
  | "sessionAssigned"
  | "sessionAssignedWithLabel"
  | "sessionDone"
  | "sessionDoneWithLabel"
  | "sessionRest"
  | "sessionSkipped"
  | "mindNudge"
  | "mindLogged"
  | "quiet";

export type TodayProseTone = "ok" | "warn" | "quiet" | "neutral";
export type TodayProseDomain = "heart" | "body" | "mind";

export type TodayProseLine = {
  key: TodayProseKey;
  params?: Record<string, string | number>;
  tone: TodayProseTone;
  domain: TodayProseDomain | null;
};

export type TodayProseHrv = {
  hasReading: boolean;
  qualitative: QualitativeBand | null;
  outOfBand: boolean;
};

export type TodaySessionState = "assigned" | "done" | "rest" | "skipped";

export type TodayProseSession = {
  state: TodaySessionState;
  dayLabel: string | null;
};

export type TodayProseMind = {
  checkedToday: boolean;
};

export type TodayProseInput = {
  hrv: TodayProseHrv;
  /** `null` = unknown (not the same as rest). */
  session: TodayProseSession | null;
  /** `null` = unknown (do not nudge, do not confirm). */
  mind: TodayProseMind | null;
};

export type TodayProseModel = {
  lines: TodayProseLine[];
  leadDomain: TodayProseDomain | null;
  leadTone: TodayProseTone;
};

const MAX_LINES = 3;
const MIN_LINES_BEFORE_MIND_LOGGED = 2;

type Candidate = { rank: number; line: TodayProseLine };

function sessionLabel(dayLabel: string | null): string | null {
  const trimmed = dayLabel?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function hrvCandidates(hrv: TodayProseHrv): Candidate[] {
  if (!hrv.hasReading || !hrv.qualitative) return [];
  if (hrv.qualitative === "lav") {
    return [
      {
        rank: 0,
        line: { key: "hrvLav", tone: "warn", domain: "heart" },
      },
    ];
  }
  if (hrv.qualitative === "ro") {
    return [
      {
        rank: 5,
        line: { key: "hrvRo", tone: "ok", domain: "heart" },
      },
    ];
  }
  return [
    {
      rank: 7,
      line: { key: "hrvMidt", tone: "neutral", domain: "heart" },
    },
  ];
}

function sessionCandidates(session: TodayProseSession | null): Candidate[] {
  if (!session) return [];
  const label = sessionLabel(session.dayLabel);
  switch (session.state) {
    case "assigned":
      return [
        {
          rank: 1,
          line: label
            ? {
                key: "sessionAssignedWithLabel",
                params: { label },
                tone: "neutral",
                domain: "body",
              }
            : { key: "sessionAssigned", tone: "neutral", domain: "body" },
        },
      ];
    case "skipped":
      return [
        {
          rank: 2,
          line: { key: "sessionSkipped", tone: "quiet", domain: "body" },
        },
      ];
    case "done":
      return [
        {
          rank: 4,
          line: label
            ? {
                key: "sessionDoneWithLabel",
                params: { label },
                tone: "ok",
                domain: "body",
              }
            : { key: "sessionDone", tone: "ok", domain: "body" },
        },
      ];
    case "rest":
      return [
        {
          rank: 6,
          line: { key: "sessionRest", tone: "quiet", domain: "body" },
        },
      ];
  }
}

function mindCandidates(mind: TodayProseMind | null): Candidate[] {
  if (!mind) return [];
  if (!mind.checkedToday) {
    return [
      {
        rank: 3,
        line: { key: "mindNudge", tone: "neutral", domain: "mind" },
      },
    ];
  }
  return [
    {
      rank: 8,
      line: { key: "mindLogged", tone: "ok", domain: "mind" },
    },
  ];
}

const QUIET_LINE: TodayProseLine = {
  key: "quiet",
  tone: "quiet",
  domain: null,
};

/**
 * Pick 1–3 most actionable Today sentences. mindLogged is filler and
 * is dropped once two stronger lines already exist.
 */
export function buildTodayProse(input: TodayProseInput): TodayProseModel {
  const candidates = [
    ...hrvCandidates(input.hrv),
    ...sessionCandidates(input.session),
    ...mindCandidates(input.mind),
  ].sort((a, b) => a.rank - b.rank);

  const lines: TodayProseLine[] = [];
  for (const candidate of candidates) {
    if (lines.length >= MAX_LINES) break;
    if (
      candidate.line.key === "mindLogged" &&
      lines.length >= MIN_LINES_BEFORE_MIND_LOGGED
    ) {
      continue;
    }
    lines.push(candidate.line);
  }

  if (lines.length === 0) {
    lines.push(QUIET_LINE);
  }

  const lead = lines[0];
  return {
    lines,
    leadDomain: lead.domain,
    leadTone: lead.tone,
  };
}

/** Europe/Copenhagen calendar day — matches the coaching week-strip. */
export function copenhagenTodayIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Demo fixture — same sources the dashboard chip / session card /
 * hasMindCheckToday already use. Locked so MUNK-01 prose stays honest.
 */
export function demoTodayProseInput(): TodayProseInput {
  const view = buildHrvBandView(demoSteadySeries());
  return {
    hrv: {
      hasReading: view.latestMs != null,
      qualitative: view.qualitative,
      outOfBand: view.outOfBand,
    },
    session: {
      state: "assigned",
      dayLabel: TODAY_SESSION.dayLabel,
    },
    mind: {
      checkedToday: true,
    },
  };
}
