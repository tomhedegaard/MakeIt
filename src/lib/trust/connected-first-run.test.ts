import { describe, expect, it } from "vitest";
import { demoEngineStrip, emptyEngineStrip } from "@/lib/adaptive/engine-strip";
import type { TodayCard } from "@/lib/data/dashboard";
import {
  emptyMemberStats,
  engineStripForSurface,
  feedForSurface,
  libraryForSurface,
  statsForSurface,
  todayCardForSurface,
  upcomingForSurface,
  weekStripForSurface,
} from "./connected-first-run";

const MOCK_TODAY: TodayCard = {
  id: "sess-2026-05-05",
  programCode: "STR-12",
  programName: "PR-Block",
  week: 4,
  isDeload: true,
  dayLabel: "Dag A — Squat",
  title: "Squat — Top set @ RPE 8",
  estimatedMinutes: 65,
  exerciseCount: 4,
  setCount: 16,
  exercises: [],
};

describe("connected first-run pickers", () => {
  it("does not fall back to mock STR-12 week 4 when connected and empty", () => {
    const today = todayCardForSurface({
      connected: true,
      fromDb: null,
      demo: MOCK_TODAY,
    });
    expect(today).toBeNull();
  });

  it("keeps the demo STR-12 card when disconnected", () => {
    const today = todayCardForSurface({
      connected: false,
      fromDb: null,
      demo: MOCK_TODAY,
    });
    expect(today?.programCode).toBe("STR-12");
    expect(today?.week).toBe(4);
  });

  it("uses real DB card when connected and one exists", () => {
    const fromDb: TodayCard = { ...MOCK_TODAY, id: "real", week: 1, isDeload: false };
    expect(
      todayCardForSurface({ connected: true, fromDb, demo: MOCK_TODAY })?.id,
    ).toBe("real");
  });

  it("treats missing upcoming/feed as empty lists in connected mode", () => {
    expect(upcomingForSurface({ connected: true, fromDb: null })).toEqual([]);
    expect(feedForSurface({ connected: true, fromDb: null })).toEqual([]);
    expect(upcomingForSurface({ connected: false, fromDb: null })).toBeNull();
    expect(feedForSurface({ connected: false, fromDb: null })).toBeNull();
  });

  it("zeros stats in connected mode instead of demo 84.2K", () => {
    expect(statsForSurface({ connected: true, fromDb: null })).toEqual(
      emptyMemberStats(),
    );
    expect(statsForSurface({ connected: false, fromDb: null })).toBeNull();
    expect(emptyMemberStats().volumeKg).toBe(0);
    expect(emptyMemberStats().streakDays).toBe(0);
  });

  it("does not use the mock week labels or mock library when connected", () => {
    const demoWeek = [
      {
        label: "Man",
        date: 4,
        iso: "2026-05-04",
        sessionLabel: "Squat",
        sessionId: null,
        done: true,
        today: false,
        rest: false,
      },
    ];
    const emptyWeek = [
      {
        label: "Man",
        date: 4,
        iso: "2026-05-04",
        sessionLabel: "Hvile",
        sessionId: null,
        done: false,
        today: false,
        rest: true,
      },
    ];
    expect(
      weekStripForSurface({
        connected: true,
        fromDb: null,
        demo: demoWeek,
        empty: emptyWeek,
      })[0].sessionLabel,
    ).toBe("Hvile");
    expect(
      libraryForSurface({
        connected: true,
        fromDb: null,
        demo: [{ id: "mock-str-12", code: "STR-12" } as never],
      }),
    ).toEqual([]);
  });

  it("strips ADAPTIVE-DEMO-STR from the connected library", () => {
    expect(
      libraryForSurface({
        connected: true,
        fromDb: [
          { id: "real-str", code: "STR-12" } as never,
          { id: "demo-str", code: "ADAPTIVE-DEMO-STR" } as never,
        ],
        demo: [],
      }).map((p) => p.code),
    ).toEqual(["STR-12"]);
  });

  it("uses the signal strip when connected and the demo strip otherwise", () => {
    const empty = emptyEngineStrip();
    expect(
      engineStripForSurface({
        connected: true,
        fromSignals: empty,
        demo: demoEngineStrip(),
      }).steps,
    ).toEqual([]);
    expect(
      engineStripForSurface({
        connected: false,
        fromSignals: empty,
        demo: demoEngineStrip(),
      }).steps.length,
    ).toBe(5);
  });
});
