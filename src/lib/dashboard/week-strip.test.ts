import { describe, expect, it } from "vitest";

import { pickDashboardTodaySession } from "./pick-today-session";
import {
  buildWeekStrip,
  compressSessionLabel,
  type WeekStripSession,
} from "./week-strip";

function row(
  partial: Partial<WeekStripSession> &
    Pick<WeekStripSession, "id" | "status" | "dayLabel" | "scheduledFor">,
): WeekStripSession {
  return {
    title: partial.dayLabel ?? "",
    ...partial,
  };
}

/** Live @tomtesty2 week-1 rows. */
const TOMTESTY2: WeekStripSession[] = [
  row({
    id: "a",
    status: "active",
    scheduledFor: "2026-09-07",
    dayLabel: "Dag A — Squat",
    title: "Squat fokus + posterior chain",
  }),
  row({
    id: "b",
    status: "scheduled",
    scheduledFor: "2026-09-08",
    dayLabel: "Dag B — Bench",
    title: "Pause-bench + horisontalt træk",
  }),
  row({
    id: "c",
    status: "scheduled",
    scheduledFor: "2026-09-09",
    dayLabel: "Dag C — Deadlift",
    title: "Deadlift fokus + benstyrke",
  }),
];

function pulsed(days: ReturnType<typeof buildWeekStrip>) {
  return days.filter((d) => d.today);
}

describe("buildWeekStrip — tomtesty2", () => {
  it("pulses Dag A / Squat on Mon 07, not Bench, while A is still open", () => {
    for (const today of ["2026-09-08", "2026-09-09"] as const) {
      const pick = pickDashboardTodaySession(TOMTESTY2, today);
      expect(pick?.dayLabel).toBe("Dag A — Squat");

      const week = buildWeekStrip({ sessions: TOMTESTY2, todayIso: today });
      const pulse = pulsed(week);
      expect(pulse).toHaveLength(1);
      expect(pulse[0]?.iso).toBe("2026-09-07");
      expect(pulse[0]?.dayKey).toBe("mon");
      expect(pulse[0]?.date).toBe(7);
      expect(pulse[0]?.sessionLabel).toBe("Squat");
      expect(pulse[0]?.sessionId).toBe("a");

      const monday = week.find((d) => d.iso === "2026-09-07");
      expect(monday?.sessionLabel).not.toBe("Bench");
      const wednesday = week.find((d) => d.iso === "2026-09-09");
      expect(wednesday?.today).toBe(false);
      expect(wednesday?.sessionLabel).toBe("Deadlift");
    }
  });

  it("moves the pulse to Dag B / Bench once A is completed", () => {
    const afterA = TOMTESTY2.map((s) =>
      s.id === "a" ? { ...s, status: "completed" as const } : s,
    );
    const week = buildWeekStrip({
      sessions: afterA,
      todayIso: "2026-09-09",
    });
    const pulse = pulsed(week);
    expect(pulse).toHaveLength(1);
    expect(pulse[0]?.iso).toBe("2026-09-08");
    expect(pulse[0]?.sessionLabel).toBe("Bench");
    expect(week.find((d) => d.iso === "2026-09-07")?.today).toBe(false);
  });
});

describe("buildWeekStrip — pick outside the calendar ISO week", () => {
  it("does not pulse Bench when Dag A sits on the previous Sunday", () => {
    const rows: WeekStripSession[] = [
      row({
        id: "a",
        status: "active",
        scheduledFor: "2026-09-06",
        dayLabel: "Dag A — Squat",
      }),
      row({
        id: "b",
        status: "scheduled",
        scheduledFor: "2026-09-07",
        dayLabel: "Dag B — Bench",
      }),
      row({
        id: "c",
        status: "scheduled",
        scheduledFor: "2026-09-08",
        dayLabel: "Dag C — Deadlift",
      }),
      row({
        id: "d",
        status: "scheduled",
        scheduledFor: "2026-09-09",
        dayLabel: "Dag D — Hyper",
      }),
    ];

    const weekOnly = rows.filter((s) => s.scheduledFor >= "2026-09-07");
    const wrong = pickDashboardTodaySession(weekOnly, "2026-09-09");
    expect(wrong?.dayLabel).toBe("Dag B — Bench");

    const week = buildWeekStrip({ sessions: rows, todayIso: "2026-09-09" });
    const pulse = pulsed(week);
    expect(pulse).toHaveLength(1);
    expect(pulse[0]?.iso).toBe("2026-09-06");
    expect(pulse[0]?.sessionLabel).toBe("Squat");
    expect(pulse[0]?.dayKey).toBe("sun");
    expect(week.some((d) => d.iso === "2026-09-07")).toBe(false);
    expect(week[0]?.iso).toBe("2026-08-31");
  });
});

describe("compressSessionLabel", () => {
  it("keeps the lift name after the em-dash", () => {
    expect(compressSessionLabel("Dag A — Squat", "Squat fokus")).toBe("Squat");
    expect(compressSessionLabel("Dag B — Bench", "")).toBe("Bench");
  });
});
