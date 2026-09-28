import { describe, expect, it } from "vitest";
import { explainerScenarioInput } from "./mock-scenarios";
import {
  buildEngineStrip,
  demoEngineStrip,
  emptyEngineStrip,
  stripFromAvailableSignals,
} from "./engine-strip";

describe("buildEngineStrip", () => {
  it("emits 3–6 steps that name domain signals", () => {
    const input = explainerScenarioInput();
    const strip = buildEngineStrip({
      ...input,
      reasons: ["hrv_low", "low_sleep", "low_feeling"],
    });
    expect(strip.steps.length).toBeGreaterThanOrEqual(3);
    expect(strip.steps.length).toBeLessThanOrEqual(6);
    const domains = new Set(strip.steps.map((s) => s.domain));
    expect(domains.has("heart")).toBe(true);
    expect(domains.has("body")).toBe(true);
    expect(domains.has("mind")).toBe(true);
  });

  it("does not invent alcohol / mind / RPE when those signals are absent", () => {
    const strip = buildEngineStrip({
      latestReading: null,
      lifestyle: {
        sleepHoursAvg2d: null,
        alcoholLast2d: false,
        feelingLast3d: null,
      },
      nextSession: null,
      recentSessions: [],
      reasons: [],
    });
    expect(strip).toEqual(emptyEngineStrip());
    expect(strip.steps.some((s) => s.key === "noAlcohol")).toBe(false);
    expect(strip.steps.some((s) => s.key === "alcohol")).toBe(false);
    expect(strip.steps.some((s) => s.key === "lowFeeling")).toBe(false);
    expect(strip.steps.some((s) => s.key === "rpeOvershoot")).toBe(false);
    expect(strip.steps.some((s) => s.key === "rpeDrift")).toBe(false);
    expect(strip.steps.some((s) => s.key === "hrvLow")).toBe(false);
    expect(strip.munkNote).toBe("");
  });

  it("does not claim no-alcohol just because alcoholLast2d is false", () => {
    const input = explainerScenarioInput();
    const strip = buildEngineStrip({
      ...input,
      latestReading: null,
      lifestyle: {
        sleepHoursAvg2d: null,
        alcoholLast2d: false,
        feelingLast3d: null,
      },
      reasons: [],
    });
    expect(strip.steps.some((s) => s.key === "noAlcohol" || s.key === "alcohol")).toBe(
      false,
    );
    expect(strip.steps.some((s) => s.key === "sessionToday")).toBe(true);
  });

  it("stripFromAvailableSignals stays empty without HRV or a session", () => {
    expect(
      stripFromAvailableSignals({
        hasHrv: false,
        readinessBucket: null,
        hasSession: false,
      }),
    ).toEqual(emptyEngineStrip());
  });

  it("returns no steps when a new member has no signals", () => {
    const strip = buildEngineStrip({
      latestReading: null,
      lifestyle: {
        sleepHoursAvg2d: null,
        alcoholLast2d: false,
        feelingLast3d: null,
      },
      nextSession: null,
      recentSessions: [],
      reasons: [],
    });
    expect(strip.steps).toEqual([]);
  });

  it("demo fixture looks real: five steps, Heart first, empty Munk slot", () => {
    const demo = demoEngineStrip();
    expect(demo.steps).toHaveLength(5);
    expect(demo.steps[0]).toEqual({ domain: "heart", key: "hrvLow" });
    expect(demo.steps.some((s) => s.domain === "body")).toBe(true);
    expect(demo.munkNote).toBe("");
  });
});
