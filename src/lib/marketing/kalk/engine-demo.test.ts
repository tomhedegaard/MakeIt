// src/lib/marketing/kalk/engine-demo.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEMO_DEFAULTS, DEMO_TOP_SET_KG, HRV_RANGE, bucketFor, buildDemoInput, runDemo } from "./engine-demo";

describe("demo-båndet (spec §3.3)", () => {
  it("dækker kun de tre buckets skyderen kan nå", () => {
    expect(bucketFor(42)).toBe("low");
    expect(bucketFor(51)).toBe("low");
    expect(bucketFor(52)).toBe("normal");
    expect(bucketFor(74)).toBe("normal");
    expect(bucketFor(75)).toBe("high");
    expect(bucketFor(86)).toBe("high");
  });

  it("kan ikke nå very_low, fordi skyderen starter ved 42", () => {
    expect(HRV_RANGE.min).toBe(42);
    expect(HRV_RANGE.max).toBe(86);
  });
});

describe("buildDemoInput (spec §3.2)", () => {
  it("overskriver præcis tre felter og lader resten stå", () => {
    const base = buildDemoInput(DEMO_DEFAULTS);
    expect(base.latestReading?.readinessBucket).toBe("low");
    expect(base.lifestyle.sleepHoursAvg2d).toBe(5);
    expect(base.lifestyle.feelingLast3d).toBe("stressed");
    // Scenariets egne værdier står urørt: målingen er frisk i forhold til now.
    expect(base.latestReading?.measuredAt).toBe("2026-05-25T05:30:00.000Z");
    expect(base.now.toISOString()).toBe("2026-05-25T07:00:00.000Z");
    expect(base.veryLowDaysLast5).toBe(1);
  });

  it("oversætter stress til feelingLast3d", () => {
    expect(buildDemoInput({ ...DEMO_DEFAULTS, stress: 5 }).lifestyle.feelingLast3d).toBe("stressed");
    expect(buildDemoInput({ ...DEMO_DEFAULTS, stress: 4 }).lifestyle.feelingLast3d).toBe("stressed");
    expect(buildDemoInput({ ...DEMO_DEFAULTS, stress: 3 }).lifestyle.feelingLast3d).toBeNull();
    expect(buildDemoInput({ ...DEMO_DEFAULTS, stress: 1 }).lifestyle.feelingLast3d).toBeNull();
  });
});

describe("runDemo (spec §3.5)", () => {
  it("standardtilstanden sænker topsættet", () => {
    const r = runDemo(DEMO_DEFAULTS);
    expect(r.decision.action).toBe("top_set_reduction");
    expect(r.topSetKg).toBeLessThan(DEMO_TOP_SET_KG);
    expect(r.changed).toBe(true);
    expect(r.decision.explanationDa.length).toBeGreaterThan(0);
  });

  it("lav HRV uden livsstilssignaler sænker volumen i stedet", () => {
    const r = runDemo({ sleep: 7.5, hrv: 46, stress: 2 });
    expect(r.decision.action).toBe("volume_reduction");
    expect(r.topSetKg).toBe(DEMO_TOP_SET_KG);
    expect(r.accessorySetsDropped).toBe(2);
  });

  it("normal HRV lader passet stå, uanset søvn og stress", () => {
    const r = runDemo({ sleep: 3, hrv: 60, stress: 5 });
    expect(r.decision.action).toBe("no_change");
    expect(r.changed).toBe(false);
  });

  it("regner vægten ud af motorens procent og falder tilbage til 10", () => {
    const r = runDemo(DEMO_DEFAULTS);
    const percent = r.decision.params.percent ?? 10;
    expect(r.topSetKg).toBe(Math.round(DEMO_TOP_SET_KG * (1 - percent / 100)));
  });
});

describe("motor-paritet (spec §8)", () => {
  const src = readFileSync(new URL("./engine-demo.ts", import.meta.url), "utf8");

  it("importerer appens motor i stedet for at kopiere den", () => {
    expect(src).toMatch(/from "@\/lib\/adaptive\/engine"/);
  });

  it("gentager ingen af motorens navngivne tærskler", () => {
    for (const t of [/\b5\.5\b/, /\b1\.5\b/, /\b1\.0\b/, /\b36\b/]) {
      expect(src).not.toMatch(t);
    }
  });
});
