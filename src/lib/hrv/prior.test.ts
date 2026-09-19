import { describe, expect, it } from "vitest";
import { priorLnRmssdForConnection, priorLnRmssdForSource, sameSourceSeries, type PriorDb } from "./prior";

/** Records the filters a query applies and resolves with the given rows. */
function fakeDb(result: { data: { ln_rmssd: number }[] | null; error: { message: string } | null }) {
  const calls: { table?: string; select?: string; eq: [string, unknown][]; order?: [string, unknown] } = { eq: [] };
  const builder = {
    select(cols: string) {
      calls.select = cols;
      return builder;
    },
    eq(col: string, value: unknown) {
      calls.eq.push([col, value]);
      return builder;
    },
    order(col: string, opts: unknown) {
      calls.order = [col, opts];
      return Promise.resolve(result);
    },
  };
  const db = {
    from(table: string) {
      calls.table = table;
      return builder;
    },
  };
  return { db: db as unknown as PriorDb, calls };
}

describe("priorLnRmssdForSource", () => {
  it("reads only the member's own, non-sick readings from the same source, oldest first", async () => {
    const { db, calls } = fakeDb({ data: [{ ln_rmssd: 4.1 }, { ln_rmssd: 4.2 }], error: null });
    const series = await priorLnRmssdForSource(db, { memberId: "m1", source: "polar_h10" });
    expect(series).toEqual([4.1, 4.2]);
    expect(calls.table).toBe("hrv_readings");
    expect(calls.eq).toEqual(
      expect.arrayContaining([
        ["member_id", "m1"],
        ["source", "polar_h10"],
        ["is_sick", false],
      ]),
    );
    expect(calls.order).toEqual(["measured_at", { ascending: true }]);
  });

  it("fails loudly rather than computing a baseline from nothing", async () => {
    const { db } = fakeDb({ data: null, error: { message: "boom" } });
    await expect(priorLnRmssdForSource(db, { memberId: "m1", source: "camera_ppg" })).rejects.toThrow(/boom/);
  });
});

describe("priorLnRmssdForConnection", () => {
  it("scopes a wearable baseline to its connection and leaves sick days out", async () => {
    const { db, calls } = fakeDb({ data: [{ ln_rmssd: 3.9 }], error: null });
    expect(await priorLnRmssdForConnection(db, "conn-1")).toEqual([3.9]);
    expect(calls.eq).toEqual(expect.arrayContaining([["connection_id", "conn-1"], ["is_sick", false]]));
  });
});

describe("sameSourceSeries", () => {
  it("keeps the same source's healthy readings in time order", () => {
    const rows = [
      { lnRmssd: 4.0, source: "camera_ppg", isSick: false, measuredAt: "2026-09-03" },
      { lnRmssd: 4.5, source: "polar_h10", isSick: false, measuredAt: "2026-09-01" },
      { lnRmssd: 4.4, source: "polar_h10", isSick: true, measuredAt: "2026-09-02" },
      { lnRmssd: 4.6, source: "polar_h10", isSick: false, measuredAt: "2026-09-04" },
    ];
    expect(sameSourceSeries(rows, "polar_h10")).toEqual([4.5, 4.6]);
    expect(sameSourceSeries(rows, "camera_ppg")).toEqual([4.0]);
  });
});
