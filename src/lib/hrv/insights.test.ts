import { describe, it, expect } from "vitest";
import {
  weekStartFor,
  buildInsightData,
  buildTemplateSummary,
  type InsightInput,
  type InsightReading,
  type InsightLog,
} from "./insights";

/** ln(rmssd) helper — keeps test fixtures readable. */
const ln = (rmssd: number) => Math.log(rmssd);

describe("weekStartFor", () => {
  it("maps a Sunday to the Monday 6 days earlier", () => {
    expect(weekStartFor(new Date("2026-05-17T12:00:00Z"))).toBe("2026-05-11");
  });
  it("maps a Monday to itself", () => {
    expect(weekStartFor(new Date("2026-05-11T00:00:00Z"))).toBe("2026-05-11");
  });
  it("maps a Wednesday to the Monday of its week", () => {
    expect(weekStartFor(new Date("2026-05-13T09:30:00Z"))).toBe("2026-05-11");
  });
});

describe("buildInsightData — week stats", () => {
  it("geometric-means current and prior week, counts current-week readings", () => {
    const readings: InsightReading[] = [
      // prior week: Mon May 4 .. Sun May 10
      { date: "2026-05-05", lnRmssd: ln(50) },
      { date: "2026-05-07", lnRmssd: ln(50) },
      // current week: Mon May 11 .. Sun May 17
      { date: "2026-05-11", lnRmssd: ln(60) },
      { date: "2026-05-13", lnRmssd: ln(60) },
      { date: "2026-05-15", lnRmssd: ln(60) },
    ];
    const input: InsightInput = {
      readings,
      lifestyleLogs: [],
      weekStart: "2026-05-11",
    };
    const data = buildInsightData(input);
    expect(data.weekStats.weekMeanRmssd).toBe(60);
    expect(data.weekStats.priorWeekMeanRmssd).toBe(50);
    expect(data.weekStats.weekReadingCount).toBe(3);
  });

  it("returns null mean and zero count for a week with no readings", () => {
    const data = buildInsightData({
      readings: [],
      lifestyleLogs: [],
      weekStart: "2026-05-11",
    });
    expect(data.weekStats.weekMeanRmssd).toBeNull();
    expect(data.weekStats.priorWeekMeanRmssd).toBeNull();
    expect(data.weekStats.weekReadingCount).toBe(0);
  });

  it("handles week-boundary readings: upper exclusive, lower inclusive, start inclusive", () => {
    const readings: InsightReading[] = [
      { date: "2026-05-04", lnRmssd: ln(40) }, // weekStart-7: prior week (inclusive)
      { date: "2026-05-11", lnRmssd: ln(70) }, // weekStart: current week (inclusive)
      { date: "2026-05-18", lnRmssd: ln(99) }, // weekStart+7: NEITHER week
    ];
    const data = buildInsightData({
      readings,
      lifestyleLogs: [],
      weekStart: "2026-05-11",
    });
    // current week has only the May 11 reading
    expect(data.weekStats.weekReadingCount).toBe(1);
    expect(data.weekStats.weekMeanRmssd).toBe(70);
    // prior week has only the May 4 reading
    expect(data.weekStats.priorWeekMeanRmssd).toBe(40);
  });
});

describe("buildInsightData — alcohol card", () => {
  it("status ok with >=4 baseline and >=4 exposed days, D+1 pairing", () => {
    const lifestyleLogs: InsightLog[] = [
      // baseline: count 0
      { date: "2026-05-11", eventType: "alcohol_drinks", value: { count: 0 } },
      { date: "2026-05-12", eventType: "alcohol_drinks", value: { count: 0 } },
      { date: "2026-05-13", eventType: "alcohol_drinks", value: { count: 0 } },
      { date: "2026-05-14", eventType: "alcohol_drinks", value: { count: 0 } },
      // exposed: count 2 or 3
      { date: "2026-05-15", eventType: "alcohol_drinks", value: { count: 2 } },
      { date: "2026-05-16", eventType: "alcohol_drinks", value: { count: 3 } },
      { date: "2026-05-17", eventType: "alcohol_drinks", value: { count: 2 } },
      { date: "2026-05-18", eventType: "alcohol_drinks", value: { count: 3 } },
      // ambiguous middle: count 1 — excluded from both groups
      { date: "2026-05-19", eventType: "alcohol_drinks", value: { count: 1 } },
    ];
    const readings: InsightReading[] = [
      // D+1 readings for baseline -> rmssd 60
      { date: "2026-05-12", lnRmssd: ln(60) },
      { date: "2026-05-13", lnRmssd: ln(60) },
      { date: "2026-05-14", lnRmssd: ln(60) },
      { date: "2026-05-15", lnRmssd: ln(60) },
      // D+1 readings for exposed -> rmssd 48
      { date: "2026-05-16", lnRmssd: ln(48) },
      { date: "2026-05-17", lnRmssd: ln(48) },
      { date: "2026-05-18", lnRmssd: ln(48) },
      { date: "2026-05-19", lnRmssd: ln(48) },
      // D+1 reading for the ambiguous count:1 log — must not be used
      { date: "2026-05-20", lnRmssd: ln(10) },
    ];
    const data = buildInsightData({
      readings,
      lifestyleLogs,
      weekStart: "2026-05-11",
    });
    const card = data.correlationCards.find((c) => c.factor === "alcohol")!;
    expect(card.status).toBe("ok");
    expect(card.baselineN).toBe(4);
    expect(card.exposedN).toBe(4);
    expect(card.baselineMeanRmssd).toBe(60);
    expect(card.exposedMeanRmssd).toBe(48);
    expect(card.deltaPct).toBe(-20); // (48-60)/60*100
  });

  it("status insufficient_data with only 2 exposed days, counts still reported", () => {
    const lifestyleLogs: InsightLog[] = [
      { date: "2026-05-11", eventType: "alcohol_drinks", value: { count: 0 } },
      { date: "2026-05-12", eventType: "alcohol_drinks", value: { count: 0 } },
      { date: "2026-05-13", eventType: "alcohol_drinks", value: { count: 0 } },
      { date: "2026-05-14", eventType: "alcohol_drinks", value: { count: 0 } },
      { date: "2026-05-15", eventType: "alcohol_drinks", value: { count: 3 } },
      { date: "2026-05-16", eventType: "alcohol_drinks", value: { count: 2 } },
    ];
    const readings: InsightReading[] = [
      { date: "2026-05-12", lnRmssd: ln(60) },
      { date: "2026-05-13", lnRmssd: ln(60) },
      { date: "2026-05-14", lnRmssd: ln(60) },
      { date: "2026-05-15", lnRmssd: ln(60) },
      { date: "2026-05-16", lnRmssd: ln(48) },
      { date: "2026-05-17", lnRmssd: ln(48) },
    ];
    const data = buildInsightData({
      readings,
      lifestyleLogs,
      weekStart: "2026-05-11",
    });
    const card = data.correlationCards.find((c) => c.factor === "alcohol")!;
    expect(card.status).toBe("insufficient_data");
    expect(card.baselineN).toBe(4);
    expect(card.exposedN).toBe(2);
    expect(card.exposedMeanRmssd).toBeNull();
    expect(card.baselineMeanRmssd).toBeNull();
    expect(card.deltaPct).toBeNull();
  });

  it("drops a log with no paired next-day reading", () => {
    const lifestyleLogs: InsightLog[] = [
      { date: "2026-05-11", eventType: "alcohol_drinks", value: { count: 0 } },
      { date: "2026-05-12", eventType: "alcohol_drinks", value: { count: 0 } },
      { date: "2026-05-13", eventType: "alcohol_drinks", value: { count: 0 } },
      { date: "2026-05-14", eventType: "alcohol_drinks", value: { count: 0 } },
      // this exposed log has no D+1 reading -> dropped
      { date: "2026-05-31", eventType: "alcohol_drinks", value: { count: 3 } },
    ];
    const readings: InsightReading[] = [
      { date: "2026-05-12", lnRmssd: ln(60) },
      { date: "2026-05-13", lnRmssd: ln(60) },
      { date: "2026-05-14", lnRmssd: ln(60) },
      { date: "2026-05-15", lnRmssd: ln(60) },
    ];
    const data = buildInsightData({
      readings,
      lifestyleLogs,
      weekStart: "2026-05-11",
    });
    const card = data.correlationCards.find((c) => c.factor === "alcohol")!;
    expect(card.baselineN).toBe(4);
    expect(card.exposedN).toBe(0);
  });
});

describe("buildInsightData — sleep card", () => {
  it("status ok with same-day pairing, exposed = hours < 7", () => {
    const lifestyleLogs: InsightLog[] = [
      { date: "2026-05-11", eventType: "sleep_hours", value: { hours: 8 } },
      { date: "2026-05-12", eventType: "sleep_hours", value: { hours: 7 } },
      { date: "2026-05-13", eventType: "sleep_hours", value: { hours: 9 } },
      { date: "2026-05-14", eventType: "sleep_hours", value: { hours: 7.5 } },
      { date: "2026-05-15", eventType: "sleep_hours", value: { hours: 5 } },
      { date: "2026-05-16", eventType: "sleep_hours", value: { hours: 6 } },
      { date: "2026-05-17", eventType: "sleep_hours", value: { hours: 4.5 } },
      { date: "2026-05-18", eventType: "sleep_hours", value: { hours: 6.9 } },
    ];
    const readings: InsightReading[] = [
      // baseline (>=7) same-day -> rmssd 70
      { date: "2026-05-11", lnRmssd: ln(70) },
      { date: "2026-05-12", lnRmssd: ln(70) },
      { date: "2026-05-13", lnRmssd: ln(70) },
      { date: "2026-05-14", lnRmssd: ln(70) },
      // exposed (<7) same-day -> rmssd 56
      { date: "2026-05-15", lnRmssd: ln(56) },
      { date: "2026-05-16", lnRmssd: ln(56) },
      { date: "2026-05-17", lnRmssd: ln(56) },
      { date: "2026-05-18", lnRmssd: ln(56) },
    ];
    const data = buildInsightData({
      readings,
      lifestyleLogs,
      weekStart: "2026-05-11",
    });
    const card = data.correlationCards.find((c) => c.factor === "sleep")!;
    expect(card.status).toBe("ok");
    expect(card.baselineN).toBe(4);
    expect(card.exposedN).toBe(4);
    expect(card.baselineMeanRmssd).toBe(70);
    expect(card.exposedMeanRmssd).toBe(56);
    expect(card.deltaPct).toBe(-20);
  });

  it("status insufficient_data when a group is too small", () => {
    const lifestyleLogs: InsightLog[] = [
      { date: "2026-05-11", eventType: "sleep_hours", value: { hours: 8 } },
      { date: "2026-05-12", eventType: "sleep_hours", value: { hours: 8 } },
      { date: "2026-05-13", eventType: "sleep_hours", value: { hours: 5 } },
    ];
    const readings: InsightReading[] = [
      { date: "2026-05-11", lnRmssd: ln(70) },
      { date: "2026-05-12", lnRmssd: ln(70) },
      { date: "2026-05-13", lnRmssd: ln(56) },
    ];
    const data = buildInsightData({
      readings,
      lifestyleLogs,
      weekStart: "2026-05-11",
    });
    const card = data.correlationCards.find((c) => c.factor === "sleep")!;
    expect(card.status).toBe("insufficient_data");
    expect(card.exposedMeanRmssd).toBeNull();
    expect(card.deltaPct).toBeNull();
  });
});

describe("buildInsightData — card order", () => {
  it("always returns [alcohol, sleep] regardless of input order", () => {
    const lifestyleLogs: InsightLog[] = [
      { date: "2026-05-11", eventType: "sleep_hours", value: { hours: 8 } },
      { date: "2026-05-12", eventType: "alcohol_drinks", value: { count: 0 } },
    ];
    const data = buildInsightData({
      readings: [],
      lifestyleLogs,
      weekStart: "2026-05-11",
    });
    expect(data.correlationCards.map((c) => c.factor)).toEqual([
      "alcohol",
      "sleep",
    ]);
  });
});

describe("buildTemplateSummary", () => {
  it("mentions the week mean and ok-card deltas", () => {
    const lifestyleLogs: InsightLog[] = [
      { date: "2026-05-11", eventType: "alcohol_drinks", value: { count: 0 } },
      { date: "2026-05-12", eventType: "alcohol_drinks", value: { count: 0 } },
      { date: "2026-05-13", eventType: "alcohol_drinks", value: { count: 0 } },
      { date: "2026-05-14", eventType: "alcohol_drinks", value: { count: 0 } },
      { date: "2026-05-15", eventType: "alcohol_drinks", value: { count: 2 } },
      { date: "2026-05-16", eventType: "alcohol_drinks", value: { count: 3 } },
      { date: "2026-05-17", eventType: "alcohol_drinks", value: { count: 2 } },
      { date: "2026-05-18", eventType: "alcohol_drinks", value: { count: 3 } },
    ];
    const readings: InsightReading[] = [
      // D+1 readings for baseline logs (05-11..05-14) -> rmssd 60
      { date: "2026-05-12", lnRmssd: ln(60) },
      { date: "2026-05-13", lnRmssd: ln(60) },
      { date: "2026-05-14", lnRmssd: ln(60) },
      { date: "2026-05-15", lnRmssd: ln(60) },
      // D+1 readings for exposed logs (05-15..05-18) -> rmssd 48
      { date: "2026-05-16", lnRmssd: ln(48) },
      { date: "2026-05-17", lnRmssd: ln(48) },
      { date: "2026-05-18", lnRmssd: ln(48) },
      { date: "2026-05-19", lnRmssd: ln(48) },
    ];
    const data = buildInsightData({
      readings,
      lifestyleLogs,
      weekStart: "2026-05-11",
    });
    const summary = buildTemplateSummary(data);
    expect(summary.length).toBeGreaterThan(0);
    expect(summary).toContain(String(data.weekStats.weekMeanRmssd));
    const alcoholCard = data.correlationCards.find(
      (c) => c.factor === "alcohol",
    )!;
    expect(alcoholCard.status).toBe("ok");
    // The Danish summary phrases a negative delta as "X% lavere", so it
    // references the deltaPct magnitude rather than the signed literal.
    expect(summary).toContain(String(Math.abs(alcoholCard.deltaPct!)));
    expect(summary).toContain("alkohol");
  });

  it("returns a safe non-empty Danish sentence with no data", () => {
    const data = buildInsightData({
      readings: [],
      lifestyleLogs: [],
      weekStart: "2026-05-11",
    });
    const summary = buildTemplateSummary(data);
    expect(summary.length).toBeGreaterThan(0);
    expect(summary).not.toContain("NaN");
    expect(summary).not.toContain("undefined");
    expect(summary).not.toContain("null");
  });
});
