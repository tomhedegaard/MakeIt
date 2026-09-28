/**
 * Pure helpers for member-initiated mental-safety escalation.
 *
 * The data layer owns the write. This module validates the member-written
 * summary and classifies write outcomes so tests can cover demo / RLS /
 * success without a live database.
 *
 * Spec: docs/superpowers/specs/2026-08-30-mental-crisis-pipeline-honesty.md
 */

export const ESCALATION_SUMMARY_MIN = 4;
export const ESCALATION_SUMMARY_MAX = 1000;

export type EscalationErrorCode =
  | "summary_too_short"
  | "summary_too_long"
  | "rls_denied"
  | "write_failed"
  | "no_supabase_client";

export type EscalationValidation =
  | { ok: true; summary: string }
  | { ok: false; error: Extract<EscalationErrorCode, "summary_too_short" | "summary_too_long"> };

export function validateEscalationSummary(raw: string): EscalationValidation {
  const summary = raw.trim();
  if (summary.length < ESCALATION_SUMMARY_MIN) {
    return { ok: false, error: "summary_too_short" };
  }
  if (summary.length > ESCALATION_SUMMARY_MAX) {
    return { ok: false, error: "summary_too_long" };
  }
  return { ok: true, summary };
}

export function buildMentalSafetyAlertInsert(memberId: string, summary: string) {
  return {
    member_id: memberId,
    summary,
    status: "open" as const,
  };
}

export type EscalationWriteError = {
  message: string;
  code?: string | null;
};

/**
 * PostgREST / Postgres signals that the row was blocked by RLS
 * (the old hrv_alerts failure mode) rather than a generic write error.
 */
export function isRlsDeniedError(error: EscalationWriteError): boolean {
  const code = (error.code ?? "").toString();
  const msg = error.message.toLowerCase();
  return (
    code === "42501" ||
    msg.includes("row-level security") ||
    msg.includes("violates row-level security") ||
    msg.includes("permission denied")
  );
}

export type EscalationWriteOutcome =
  | { ok: true; kind: "demo"; persisted: false; alertId: string }
  | { ok: true; kind: "reused" | "inserted"; persisted: true; alertId: string }
  | { ok: false; kind: "rls_denied" | "write_failed"; error: EscalationErrorCode };

export function classifyEscalationWrite(input: {
  supabaseEnabled: boolean;
  demoAlertId?: string;
  reusedId?: string | null;
  insertedId?: string | null;
  writeError?: EscalationWriteError | null;
}): EscalationWriteOutcome {
  if (!input.supabaseEnabled) {
    return {
      ok: true,
      kind: "demo",
      persisted: false,
      alertId: input.demoAlertId ?? "demo-mental",
    };
  }

  if (input.writeError) {
    if (isRlsDeniedError(input.writeError)) {
      return { ok: false, kind: "rls_denied", error: "rls_denied" };
    }
    return { ok: false, kind: "write_failed", error: "write_failed" };
  }

  if (input.reusedId) {
    return {
      ok: true,
      kind: "reused",
      persisted: true,
      alertId: input.reusedId,
    };
  }

  if (input.insertedId) {
    return {
      ok: true,
      kind: "inserted",
      persisted: true,
      alertId: input.insertedId,
    };
  }

  return { ok: false, kind: "write_failed", error: "write_failed" };
}
