// src/lib/marketing/kalk/engine-demo.test.ts
import { describe, expect, it } from "vitest";
import { DEMO_DEFAULTS, HRV_RANGE, bucketFor, buildDemoInput } from "./engine-demo";

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
