/**
 * Coach Priority Inbox — pure rank / merge (A2).
 *
 * Spec: docs/superpowers/specs/2026-09-03-coach-priority-inbox.md
 *
 * No DB, no React, no i18n strings. The data composer maps live/demo
 * fetchers into PriorityInboxInputs; this module emits one ordered
 * list of triage rows. Copy lives in messages/{da,en}/Coach.json.
 */

export type PriorityInboxKind =
  | "mental_safety"
  | "hrv_alert"
  | "adaptive"
  | "form_check"
  | "stale_session";

export type PriorityInboxReasonKey =
  | "chipMentalSafety"
  | "chipHrv"
  | "chipAdaptive"
  | "chipFormCheck"
  | "chipFormCheckFallback"
  | "chipStale"
  | "chipStaleNever";

export type PriorityInboxItem = {
  id: string;
  kind: PriorityInboxKind;
  memberId: string;
  memberHandle: string;
  occurredAt: string;
  href: string;
  reasonKey: PriorityInboxReasonKey;
  reasonParams?: Record<string, string | number>;
};

export type MentalSafetyInput = {
  id: string;
  memberId: string;
  memberHandle: string;
  createdAt: string;
};

export type HrvAlertInput = {
  id: string;
  memberId: string;
  memberHandle: string;
  triggeredAt: string;
};

export type AdaptiveInput = {
  alertId: string;
  memberId: string;
  memberHandle: string;
  triggeredAt: string;
  action: string;
};

export type FormCheckInput = {
  id: string;
  memberId: string;
  memberHandle: string;
  createdAt: string;
  exerciseName: string | null;
};

export type StaleMemberInput = {
  id: string;
  handle: string;
  daysSinceLastSession: number | null;
  /** Analytics bucket. Only atRisk / inactive enter the inbox. */
  bucket: "active" | "slowing" | "atRisk" | "inactive";
  /** ISO last completed session, when known. */
  lastSessionAt?: string | null;
};

export type PriorityInboxInputs = {
  mentalSafety: MentalSafetyInput[];
  hrvAlerts: HrvAlertInput[];
  adaptive: AdaptiveInput[];
  formChecks: FormCheckInput[];
  stale: StaleMemberInput[];
  /** Injected for stale occurredAt + tests. Defaults to wall clock. */
  now?: Date;
};

export const KIND_RANK: Record<PriorityInboxKind, number> = {
  mental_safety: 0,
  hrv_alert: 1,
  adaptive: 2,
  form_check: 3,
  stale_session: 4,
};

const NEWEST_FIRST = new Set<PriorityInboxKind>([
  "mental_safety",
  "hrv_alert",
  "adaptive",
]);

export function hrefForInboxKind(
  kind: PriorityInboxKind,
  memberId: string,
): string {
  switch (kind) {
    case "mental_safety":
      return "/coach/safety";
    case "hrv_alert":
    case "adaptive":
    case "form_check":
      return "/coach/queue";
    case "stale_session":
      return `/coach/members/${memberId}`;
  }
}

export function isInboxStaleBucket(
  bucket: StaleMemberInput["bucket"],
): boolean {
  return bucket === "atRisk" || bucket === "inactive";
}

function mapMentalSafety(rows: MentalSafetyInput[]): PriorityInboxItem[] {
  return rows.map((r) => ({
    id: `mental_safety:${r.id}`,
    kind: "mental_safety",
    memberId: r.memberId,
    memberHandle: r.memberHandle,
    occurredAt: r.createdAt,
    href: hrefForInboxKind("mental_safety", r.memberId),
    reasonKey: "chipMentalSafety",
  }));
}

function mapHrv(rows: HrvAlertInput[]): PriorityInboxItem[] {
  return rows.map((r) => ({
    id: `hrv_alert:${r.id}`,
    kind: "hrv_alert",
    memberId: r.memberId,
    memberHandle: r.memberHandle,
    occurredAt: r.triggeredAt,
    href: hrefForInboxKind("hrv_alert", r.memberId),
    reasonKey: "chipHrv",
  }));
}

function mapAdaptive(rows: AdaptiveInput[]): PriorityInboxItem[] {
  return rows.map((r) => ({
    id: `adaptive:${r.alertId}`,
    kind: "adaptive",
    memberId: r.memberId,
    memberHandle: r.memberHandle,
    occurredAt: r.triggeredAt,
    href: hrefForInboxKind("adaptive", r.memberId),
    reasonKey: "chipAdaptive",
    reasonParams: { action: r.action },
  }));
}

function mapFormChecks(rows: FormCheckInput[]): PriorityInboxItem[] {
  return rows.map((r) => ({
    id: `form_check:${r.id}`,
    kind: "form_check",
    memberId: r.memberId,
    memberHandle: r.memberHandle,
    occurredAt: r.createdAt,
    href: hrefForInboxKind("form_check", r.memberId),
    reasonKey: r.exerciseName ? "chipFormCheck" : "chipFormCheckFallback",
    reasonParams: r.exerciseName ? { exercise: r.exerciseName } : undefined,
  }));
}

function staleOccurredAt(row: StaleMemberInput, now: Date): string {
  if (row.lastSessionAt) return row.lastSessionAt;
  if (row.daysSinceLastSession != null) {
    return new Date(
      now.getTime() - row.daysSinceLastSession * 86_400_000,
    ).toISOString();
  }
  return "1970-01-01T00:00:00.000Z";
}

function mapStale(rows: StaleMemberInput[], now: Date): PriorityInboxItem[] {
  return rows.filter((r) => isInboxStaleBucket(r.bucket)).map((r) => {
    const days = r.daysSinceLastSession;
    return {
      id: `stale_session:${r.id}`,
      kind: "stale_session" as const,
      memberId: r.id,
      memberHandle: r.handle,
      occurredAt: staleOccurredAt(r, now),
      href: hrefForInboxKind("stale_session", r.id),
      reasonKey: (days == null ? "chipStaleNever" : "chipStale") as PriorityInboxReasonKey,
      reasonParams: days == null ? undefined : { days },
    };
  });
}

/**
 * Stale rows sort by days-since (highest first), not by the synthetic
 * occurredAt. Never-trained (`days === null`) sort last within kind.
 */
function staleSortKey(item: PriorityInboxItem): number {
  if (item.kind !== "stale_session") return 0;
  const days = item.reasonParams?.days;
  if (typeof days === "number") return days;
  return -1;
}

export function mergePriorityInbox(
  inputs: PriorityInboxInputs,
): PriorityInboxItem[] {
  const now = inputs.now ?? new Date();
  const items: PriorityInboxItem[] = [
    ...mapMentalSafety(inputs.mentalSafety),
    ...mapHrv(inputs.hrvAlerts),
    ...mapAdaptive(inputs.adaptive),
    ...mapFormChecks(inputs.formChecks),
    ...mapStale(inputs.stale, now),
  ];

  items.sort((a, b) => {
    const rank = KIND_RANK[a.kind] - KIND_RANK[b.kind];
    if (rank !== 0) return rank;
    if (a.kind === "stale_session" && b.kind === "stale_session") {
      return staleSortKey(b) - staleSortKey(a);
    }
    const cmp = a.occurredAt.localeCompare(b.occurredAt);
    return NEWEST_FIRST.has(a.kind) ? -cmp : cmp;
  });

  return items;
}
