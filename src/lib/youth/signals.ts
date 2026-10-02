/**
 * MakeIt Ung — signs of a strained relationship with training
 * (spec 2026-09-27-makeit-ung-design.md, afsnit 4 og 5).
 *
 * Fixed rules, not AI, so the message to the guardian can always say
 * exactly what was seen. Pure: the cron and the journal hook load the
 * data and hand it in. Thresholds are deliberately cautious — the spec
 * prefers one notice too few over a stream of alarms.
 */
import { isoPlusDays } from "@/lib/dates/copenhagen";

export type NoticeLevel = "acute" | "concern";
export type NoticeSignal = "crisis_language" | "daily_training" | "double_sessions";
export type ConcernSignal = Exclude<NoticeSignal, "crisis_language">;

/** Two full weeks, ending yesterday (today is not over yet). */
export const SIGNAL_WINDOW_DAYS = 14;

/**
 * Trained on at least 12 of 14 days: two rest days or fewer in two
 * weeks. UNG-01 prescribes three days a week, so this is four times the
 * programme and cannot come from following it.
 */
export const DAILY_TRAINING_MIN_DAYS = 12;

/**
 * Days with two or more finished sessions. One such day happens (a
 * session logged twice, a split day); three spread over at least a
 * week is a pattern.
 */
export const DOUBLE_SESSION_MIN_DAYS = 3;

/** The spec's "har stået på i mindst 7 dage". */
export const CONCERN_MIN_SPAN_DAYS = 7;

/** The same concern sign is sent at most once per 14 days (spec afsnit 5). */
export const CONCERN_COOLDOWN_DAYS = 14;

/**
 * Acute notices go out at once, but at most once a day: a young member
 * who saves the same journal entry twice should not send two e-mails.
 */
export const ACUTE_COOLDOWN_HOURS = 24;

export type SignalDetail = {
  /** Days in the window with at least one finished session. */
  trainedDays?: number;
  /** Days in the window with two or more finished sessions. */
  doubleDays?: number;
  windowDays?: number;
};

export type SignalHit = {
  signal: ConcernSignal;
  detail: SignalDetail;
  observedFrom: string;
  observedTo: string;
};

function daySpan(first: string, last: string): number {
  return Math.round((Date.parse(`${last}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 86_400_000) + 1;
}

/**
 * Evaluate the concern signs from the Copenhagen calendar day of each
 * finished session (one entry per session, so a day can repeat).
 * `today` is the Copenhagen day the check runs; the window is the 14
 * days before it.
 */
export function evaluateSignals(sessionDays: string[], today: string): SignalHit[] {
  const from = isoPlusDays(today, -SIGNAL_WINDOW_DAYS);
  const to = isoPlusDays(today, -1);
  const perDay = new Map<string, number>();
  for (const d of sessionDays) {
    if (d < from || d > to) continue;
    perDay.set(d, (perDay.get(d) ?? 0) + 1);
  }

  const hits: SignalHit[] = [];
  const trained = [...perDay.keys()].sort();
  if (trained.length >= DAILY_TRAINING_MIN_DAYS) {
    hits.push({
      signal: "daily_training",
      detail: { trainedDays: trained.length, windowDays: SIGNAL_WINDOW_DAYS },
      observedFrom: from,
      observedTo: to,
    });
  }

  const doubles = trained.filter((d) => (perDay.get(d) ?? 0) >= 2);
  if (
    doubles.length >= DOUBLE_SESSION_MIN_DAYS &&
    daySpan(doubles[0], doubles[doubles.length - 1]) >= CONCERN_MIN_SPAN_DAYS
  ) {
    hits.push({
      signal: "double_sessions",
      detail: { doubleDays: doubles.length, windowDays: SIGNAL_WINDOW_DAYS },
      observedFrom: from,
      observedTo: to,
    });
  }
  return hits;
}

/** True while the last notice for this sign is still inside its cooldown. */
export function inCooldown(signal: NoticeSignal, lastNoticeAt: Date | null, now: Date): boolean {
  if (!lastNoticeAt) return false;
  const hours = signal === "crisis_language" ? ACUTE_COOLDOWN_HOURS : CONCERN_COOLDOWN_DAYS * 24;
  return now.getTime() - lastNoticeAt.getTime() < hours * 3_600_000;
}

export function levelOf(signal: NoticeSignal): NoticeLevel {
  return signal === "crisis_language" ? "acute" : "concern";
}

/** ICU values for the notice copy (messages Youth.notices.<signal>). */
export function noticeValues(detail: SignalDetail, name: string): Record<string, string | number> {
  return {
    name,
    trainedDays: detail.trainedDays ?? 0,
    doubleDays: detail.doubleDays ?? 0,
    windowDays: detail.windowDays ?? SIGNAL_WINDOW_DAYS,
  };
}
