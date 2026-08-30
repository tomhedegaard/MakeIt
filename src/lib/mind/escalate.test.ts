import { describe, expect, it } from "vitest";
import {
  buildMentalSafetyAlertInsert,
  classifyEscalationWrite,
  isRlsDeniedError,
  validateEscalationSummary,
} from "./escalate";

describe("validateEscalationSummary", () => {
  it("rejects empty / too-short input", () => {
    expect(validateEscalationSummary("")).toEqual({
      ok: false,
      error: "summary_too_short",
    });
    expect(validateEscalationSummary("  ab  ")).toEqual({
      ok: false,
      error: "summary_too_short",
    });
  });

  it("rejects over-long input", () => {
    const tooLong = "x".repeat(1001);
    expect(validateEscalationSummary(tooLong)).toEqual({
      ok: false,
      error: "summary_too_long",
    });
  });

  it("trims and accepts a valid summary", () => {
    expect(validateEscalationSummary("  jeg har det svært  ")).toEqual({
      ok: true,
      summary: "jeg har det svært",
    });
  });
});

describe("buildMentalSafetyAlertInsert", () => {
  it("builds an open row with the member-written summary only", () => {
    expect(buildMentalSafetyAlertInsert("member-1", "kun denne tekst")).toEqual({
      member_id: "member-1",
      summary: "kun denne tekst",
      status: "open",
    });
  });
});

describe("isRlsDeniedError", () => {
  it("detects Postgres 42501 and RLS policy wording", () => {
    expect(isRlsDeniedError({ message: "denied", code: "42501" })).toBe(true);
    expect(
      isRlsDeniedError({
        message: "new row violates row-level security policy",
      }),
    ).toBe(true);
    expect(isRlsDeniedError({ message: "permission denied for table" })).toBe(
      true,
    );
  });

  it("does not treat a generic write error as RLS", () => {
    expect(isRlsDeniedError({ message: "connection refused" })).toBe(false);
  });
});

describe("classifyEscalationWrite", () => {
  it("demo path is ok but not persisted", () => {
    const r = classifyEscalationWrite({
      supabaseEnabled: false,
      demoAlertId: "demo-mental-1",
    });
    expect(r).toEqual({
      ok: true,
      kind: "demo",
      persisted: false,
      alertId: "demo-mental-1",
    });
  });

  it("RLS denial is not success", () => {
    const r = classifyEscalationWrite({
      supabaseEnabled: true,
      writeError: {
        message: "new row violates row-level security policy for table hrv_alerts",
        code: "42501",
      },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.kind).toBe("rls_denied");
      expect(r.error).toBe("rls_denied");
    }
  });

  it("generic write failure is not success", () => {
    const r = classifyEscalationWrite({
      supabaseEnabled: true,
      writeError: { message: "could not connect" },
    });
    expect(r).toEqual({
      ok: false,
      kind: "write_failed",
      error: "write_failed",
    });
  });

  it("reuse of an open row is persisted success", () => {
    const r = classifyEscalationWrite({
      supabaseEnabled: true,
      reusedId: "alert-existing",
    });
    expect(r).toEqual({
      ok: true,
      kind: "reused",
      persisted: true,
      alertId: "alert-existing",
    });
  });

  it("fresh insert is persisted success", () => {
    const r = classifyEscalationWrite({
      supabaseEnabled: true,
      insertedId: "alert-new",
    });
    expect(r).toEqual({
      ok: true,
      kind: "inserted",
      persisted: true,
      alertId: "alert-new",
    });
  });

  it("connected mode with neither id nor error is write_failed", () => {
    const r = classifyEscalationWrite({ supabaseEnabled: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("write_failed");
  });
});
