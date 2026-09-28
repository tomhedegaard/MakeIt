import { describe, expect, it } from "vitest";
import { buildMorningSignal } from "./morning-signal";

describe("buildMorningSignal", () => {
  const base = {
    session: { adapted: true },
    hrv: { rmssdMs: 48, bucket: "low" as const },
    mindCheckedToday: false,
    intake: { consumedKcal: 640, targetKcal: 2740 },
  };

  it("returns four cells in fixed domain order with links", () => {
    const cells = buildMorningSignal(base);
    expect(cells.map((c) => c.domain)).toEqual(["body", "heart", "mind", "food"]);
    expect(cells.map((c) => c.href)).toEqual(["/coaching", "/hrv", "/mind/check", "/nutrition"]);
  });

  it("states facts, not scores", () => {
    const [body, heart, mind, food] = buildMorningSignal(base);
    expect(body).toMatchObject({ valueKey: "adapted" });
    expect(buildMorningSignal({ ...base, session: { adapted: false } })[0].valueKey).toBe("planned");
    expect(buildMorningSignal({ ...base, hrv: { rmssdMs: 50, bucket: null } })[1].valueKey).toBe("measured");
    expect(heart).toMatchObject({ value: "48", unit: "ms", valueKey: "belowBand" });
    expect(mind).toMatchObject({ valueKey: "checkIn" });
    expect(food).toMatchObject({ value: "640", unit: "kcal", of: "2740" });
  });

  it("maps every readiness bucket to a band fact", () => {
    const key = (bucket: "very_low" | "low" | "normal" | "high" | "very_high") =>
      buildMorningSignal({ ...base, hrv: { rmssdMs: 50, bucket } })[1].valueKey;
    expect(key("very_low")).toBe("belowBand");
    expect(key("normal")).toBe("inBand");
    expect(key("high")).toBe("aboveBand");
    expect(key("very_high")).toBe("aboveBand");
    expect(buildMorningSignal({ ...base, mindCheckedToday: true })[2].valueKey).toBe("checkedIn");
  });

  it("degrades honestly when data is missing", () => {
    const [body, heart, , food] = buildMorningSignal({
      session: null, hrv: null, mindCheckedToday: true, intake: { consumedKcal: 0, targetKcal: null },
    });
    expect(body.valueKey).toBe("noSession");
    expect(heart.valueKey).toBe("noReading");
    expect(heart.value).toBeUndefined();
    expect(food.of).toBeUndefined();
  });
});
