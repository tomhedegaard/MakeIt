import { describe, expect, it } from "vitest";
import { explainerScenarioInput } from "./mock-scenarios";
import { buildEngineStrip, demoEngineStrip } from "./engine-strip";

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

  it("pads to three honest read-steps when few reasons fire", () => {
    const input = explainerScenarioInput();
    const strip = buildEngineStrip({
      ...input,
      latestReading: {
        ...input.latestReading!,
        readinessBucket: "normal",
      },
      reasons: [],
    });
    expect(strip.steps.length).toBeGreaterThanOrEqual(3);
    expect(strip.munkNote).toBe("");
  });

  it("demo fixture looks real: five steps, Heart first, empty Munk slot", () => {
    const demo = demoEngineStrip();
    expect(demo.steps).toHaveLength(5);
    expect(demo.steps[0]).toEqual({ domain: "heart", key: "hrvLow" });
    expect(demo.steps.some((s) => s.domain === "body")).toBe(true);
    expect(demo.munkNote).toBe("");
  });
});
