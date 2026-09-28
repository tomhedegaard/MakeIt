import { describe, expect, it } from "vitest";
import {
  EMPTY_STREAK_THRESHOLD,
  emptySuccessStreak,
  evaluateCronHealth,
  extractRunStats,
  isEmptySuccess,
  shouldAlertEmptyStreak,
  type CronRunRecord,
  type CronRunStats,
} from "./health";

function run(
  partial: Partial<CronRunStats> & Pick<CronRunStats, "cron">,
): CronRunStats {
  return {
    ok: true,
    generated: 0,
    failed: 0,
    candidates: 0,
    ...partial,
  };
}

function dated(
  partial: Partial<CronRunRecord> & Pick<CronRunStats, "cron">,
  at: string,
): CronRunRecord {
  return { ...run(partial), at };
}

describe("isEmptySuccess", () => {
  it("is not empty when there were no candidates", () => {
    expect(
      isEmptySuccess(run({ cron: "mental-coach-daily", candidates: 0, generated: 0 })),
    ).toBe(false);
  });

  it("is empty when candidates exist and generated is 0", () => {
    expect(
      isEmptySuccess(run({ cron: "mental-coach-daily", candidates: 4, generated: 0 })),
    ).toBe(true);
  });

  it("is not empty when useful work happened", () => {
    expect(
      isEmptySuccess(run({ cron: "mental-coach-daily", candidates: 4, generated: 2 })),
    ).toBe(false);
  });

  it("is not empty when ok is false", () => {
    expect(
      isEmptySuccess(
        run({ cron: "mental-coach-daily", ok: false, candidates: 4, generated: 0 }),
      ),
    ).toBe(false);
  });
});

describe("emptySuccessStreak / shouldAlertEmptyStreak", () => {
  const empty = run({ cron: "mental-coach-daily", candidates: 3, generated: 0 });
  const useful = run({ cron: "mental-coach-daily", candidates: 3, generated: 1 });
  const failed = run({
    cron: "mental-coach-daily",
    ok: false,
    candidates: 3,
    generated: 0,
    failed: 3,
  });

  it("does not alert on two empty successes", () => {
    expect(emptySuccessStreak([empty, empty])).toBe(2);
    expect(shouldAlertEmptyStreak([empty, empty])).toBe(false);
  });

  it("alerts on three consecutive empty successes", () => {
    expect(emptySuccessStreak([empty, empty, empty])).toBe(3);
    expect(shouldAlertEmptyStreak([empty, empty, empty])).toBe(true);
    expect(EMPTY_STREAK_THRESHOLD).toBe(3);
  });

  it("resets when a non-empty success appears", () => {
    expect(emptySuccessStreak([empty, useful, empty, empty, empty])).toBe(1);
    expect(shouldAlertEmptyStreak([empty, useful, empty, empty, empty])).toBe(
      false,
    );
  });

  it("skips failures when counting consecutive successes", () => {
    expect(emptySuccessStreak([empty, failed, empty, empty])).toBe(3);
    expect(shouldAlertEmptyStreak([empty, failed, empty, empty])).toBe(true);
  });

  it("treats a trailing failure as skip, not a reset of older empties", () => {
    expect(emptySuccessStreak([failed, empty, empty])).toBe(2);
    expect(shouldAlertEmptyStreak([failed, empty, empty])).toBe(false);
  });
});

describe("extractRunStats", () => {
  it("maps mental-coach-daily generated + candidates", () => {
    expect(
      extractRunStats("mental-coach-daily", {
        ok: true,
        candidates: 5,
        generated: 0,
        fallback: 4,
        nudged: 1,
        failed: 0,
      }),
    ).toEqual({
      cron: "mental-coach-daily",
      ok: true,
      generated: 0,
      failed: 0,
      candidates: 5,
    });
  });

  it("maps adapt-program-daily persisted + skipped_no_action as generated", () => {
    const noChange = extractRunStats("adapt-program-daily", {
      ok: true,
      eligible: 8,
      persisted: 0,
      skipped_no_action: 7,
      skipped_no_session: 1,
      failed: 0,
    });
    expect(noChange).toEqual({
      cron: "adapt-program-daily",
      ok: true,
      generated: 7,
      failed: 0,
      candidates: 8,
    });
    expect(isEmptySuccess(noChange)).toBe(false);
  });

  it("treats adapt with eligible but no evaluation as empty", () => {
    const dead = extractRunStats("adapt-program-daily", {
      ok: true,
      eligible: 8,
      persisted: 0,
      skipped_no_action: 0,
      skipped_no_session: 0,
      failed: 8,
    });
    expect(dead.generated).toBe(0);
    expect(isEmptySuccess(dead)).toBe(true);
  });

  it("maps draft-form-check-replies drafted + pending", () => {
    expect(
      extractRunStats("draft-form-check-replies", {
        ok: true,
        pending: 3,
        drafted: 0,
        skipped_no_draft: 3,
        failed: 0,
      }),
    ).toEqual({
      cron: "draft-form-check-replies",
      ok: true,
      generated: 0,
      failed: 0,
      candidates: 3,
    });
  });

  it("maps coach-morning-report written + coaches", () => {
    expect(
      extractRunStats("coach-morning-report", {
        ok: true,
        coaches: 1,
        written: 1,
        emailed: 0,
        failed: 0,
      }),
    ).toEqual({
      cron: "coach-morning-report",
      ok: true,
      generated: 1,
      failed: 0,
      candidates: 1,
    });
  });

  it("treats a missing ok flag as not-ok", () => {
    expect(extractRunStats("mental-coach-daily", { generated: 1, candidates: 1 }).ok).toBe(
      false,
    );
  });
});

describe("evaluateCronHealth", () => {
  it("returns none when there are no runs", () => {
    const row = evaluateCronHealth("mental-coach-daily", []);
    expect(row.status).toBe("none");
    expect(row.alert).toBe(false);
    expect(row.lastRun).toBeNull();
  });

  it("marks quiet + alert after three empty successes", () => {
    const runs = [
      dated({ cron: "mental-coach-daily", candidates: 2, generated: 0 }, "2026-09-03T04:30:00Z"),
      dated({ cron: "mental-coach-daily", candidates: 2, generated: 0 }, "2026-09-02T04:30:00Z"),
      dated({ cron: "mental-coach-daily", candidates: 2, generated: 0 }, "2026-09-01T04:30:00Z"),
    ];
    const row = evaluateCronHealth("mental-coach-daily", runs);
    expect(row.status).toBe("quiet");
    expect(row.alert).toBe(true);
    expect(row.emptyStreak).toBe(3);
  });
});
