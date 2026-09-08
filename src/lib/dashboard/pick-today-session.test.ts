import { describe, expect, it } from "vitest";

import { buildTodayProse } from "./today-prose";
import {
  pickDashboardTodaySession,
  preferSessionForDate,
  todayProseSessionFromPick,
  weekStripPulseIso,
  type TodaySessionCandidate,
} from "./pick-today-session";

function row(
  partial: Partial<TodaySessionCandidate> &
    Pick<TodaySessionCandidate, "id" | "status" | "dayLabel">,
): TodaySessionCandidate {
  return {
    scheduledFor: null,
    title: partial.dayLabel ?? "",
    ...partial,
  };
}

/** Live @tomtesty2 week-1 rows as of 2026-09-08. */
const TOMTESTY2: TodaySessionCandidate[] = [
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

describe("pickDashboardTodaySession — tomtesty2 mismatch", () => {
  it("picks the active Dag A, not calendar-today Dag B", () => {
    const picked = pickDashboardTodaySession(TOMTESTY2, "2026-09-08");
    expect(picked?.id).toBe("a");
    expect(picked?.dayLabel).toBe("Dag A — Squat");

    const prose = todayProseSessionFromPick(picked);
    expect(prose.state).toBe("assigned");
    expect(prose.dayLabel).toBe(picked?.dayLabel);

    const model = buildTodayProse({
      hrv: { hasReading: false, qualitative: null, outOfBand: false },
      session: prose,
      mind: { checkedToday: true },
    });
    expect(model.lines[0]?.key).toBe("sessionAssignedWithLabel");
    expect(model.lines[0]?.params).toEqual({ label: "Dag A — Squat" });
  });

  it("keeps header + card on Dag A on the onboarding calendar day", () => {
    const onboard = TOMTESTY2.map((s) =>
      s.id === "a" ? { ...s, status: "scheduled" as const } : s,
    );
    const picked = pickDashboardTodaySession(onboard, "2026-09-07");
    expect(picked?.dayLabel).toBe("Dag A — Squat");
    expect(todayProseSessionFromPick(picked).dayLabel).toBe("Dag A — Squat");
  });

  it("moves to Dag B once the overdue / active pas is closed", () => {
    const afterA = TOMTESTY2.map((s) =>
      s.id === "a" ? { ...s, status: "completed" as const } : s,
    );
    const picked = pickDashboardTodaySession(afterA, "2026-09-08");
    expect(picked?.id).toBe("b");
    expect(picked?.dayLabel).toBe("Dag B — Bench");
    expect(todayProseSessionFromPick(picked).dayLabel).toBe("Dag B — Bench");
  });
});

describe("pickDashboardTodaySession — other days", () => {
  it("uses the Copenhagen-today done row when nothing is open", () => {
    const picked = pickDashboardTodaySession(
      [
        row({
          id: "b",
          status: "completed",
          scheduledFor: "2026-09-08",
          dayLabel: "Dag B — Bench",
        }),
        row({
          id: "c",
          status: "skipped",
          scheduledFor: "2026-09-09",
          dayLabel: "Dag C — Deadlift",
        }),
      ],
      "2026-09-08",
    );
    expect(picked?.id).toBe("b");
    expect(todayProseSessionFromPick(picked).state).toBe("done");
  });

  it("falls through to the next upcoming open session on a rest day", () => {
    const picked = pickDashboardTodaySession(
      [
        row({
          id: "c",
          status: "scheduled",
          scheduledFor: "2026-09-09",
          dayLabel: "Dag C — Deadlift",
        }),
      ],
      "2026-09-08",
    );
    expect(picked?.dayLabel).toBe("Dag C — Deadlift");
    expect(todayProseSessionFromPick(picked).state).toBe("assigned");
  });

  it("prefers today's open session over a leftover skipped row on the same date", () => {
    const picked = pickDashboardTodaySession(
      [
        row({
          id: "old",
          status: "skipped",
          scheduledFor: "2026-09-08",
          dayLabel: "Dag D — Hyper",
        }),
        row({
          id: "live",
          status: "scheduled",
          scheduledFor: "2026-09-08",
          dayLabel: "Dag C — Deadlift",
        }),
      ],
      "2026-09-08",
    );
    expect(picked?.id).toBe("live");
    expect(picked?.dayLabel).toBe("Dag C — Deadlift");
  });

  it("returns null when there is nothing to show", () => {
    expect(pickDashboardTodaySession([], "2026-09-08")).toBeNull();
    expect(todayProseSessionFromPick(null)).toEqual({
      state: "rest",
      dayLabel: null,
    });
  });

  it("does not let an undated leftover steal Today from a dated open pas", () => {
    const picked = pickDashboardTodaySession(
      [
        row({
          id: "ghost",
          status: "scheduled",
          scheduledFor: null,
          dayLabel: "Old leftover",
        }),
        row({
          id: "a",
          status: "scheduled",
          scheduledFor: "2026-09-08",
          dayLabel: "Dag A — Squat",
        }),
      ],
      "2026-09-08",
    );
    expect(picked?.id).toBe("a");
  });
});

describe("weekStripPulseIso + same-date prefer", () => {
  it("pulses the picked session day when it is in the week", () => {
    expect(
      weekStripPulseIso("2026-09-07", "2026-09-08", [
        "2026-09-07",
        "2026-09-08",
        "2026-09-09",
      ]),
    ).toBe("2026-09-07");
  });

  it("falls back to Copenhagen today when the pick is outside the week", () => {
    expect(
      weekStripPulseIso("2026-08-31", "2026-09-08", [
        "2026-09-07",
        "2026-09-08",
      ]),
    ).toBe("2026-09-08");
  });

  it("keeps an open session over a skipped leftover on the same date", () => {
    const kept = preferSessionForDate(
      { status: "skipped" as const },
      { status: "scheduled" as const },
    );
    expect(kept.status).toBe("scheduled");
  });
});
