/**
 * Unit tests for the Today prose pure builder (A3).
 *
 * Covers rank order, 3-line cap, mindLogged filler rule, session
 * states, missing HRV, empty → quiet, and the demo fixture.
 */

import { describe, expect, it } from "vitest";

import {
  buildTodayProse,
  copenhagenTodayIso,
  demoTodayProseInput,
  type TodayProseInput,
  type TodayProseKey,
} from "./today-prose";

function input(
  overrides: {
    hrv?: Partial<TodayProseInput["hrv"]>;
    session?: TodayProseInput["session"];
    mind?: TodayProseInput["mind"];
  } = {},
): TodayProseInput {
  return {
    hrv: {
      hasReading: false,
      qualitative: null,
      outOfBand: false,
      ...overrides.hrv,
    },
    session:
      overrides.session === undefined
        ? { state: "rest", dayLabel: null }
        : overrides.session,
    mind:
      overrides.mind === undefined ? { checkedToday: true } : overrides.mind,
  };
}

function keysOf(model: ReturnType<typeof buildTodayProse>): TodayProseKey[] {
  return model.lines.map((line) => line.key);
}

describe("buildTodayProse — empty / quiet", () => {
  it("rest + mind logged is honest calm, not manufactured urgency", () => {
    const model = buildTodayProse(input());
    expect(keysOf(model)).toEqual(["sessionRest", "mindLogged"]);
    expect(model.leadTone).toBe("quiet");
    expect(model.leadDomain).toBe("body");
  });

  it("emits a single quiet line when every signal is unknown", () => {
    const model = buildTodayProse(
      input({ session: null, mind: null }),
    );
    expect(keysOf(model)).toEqual(["quiet"]);
    expect(model.lines).toHaveLength(1);
    expect(model.leadTone).toBe("quiet");
    expect(model.leadDomain).toBeNull();
  });
});

describe("buildTodayProse — rank", () => {
  it("leads with hrvLav, then assigned, then mindNudge (cap 3)", () => {
    const model = buildTodayProse(
      input({
        hrv: { hasReading: true, qualitative: "lav", outOfBand: true },
        session: { state: "assigned", dayLabel: "Dag A — Squat" },
        mind: { checkedToday: false },
      }),
    );
    expect(keysOf(model)).toEqual([
      "hrvLav",
      "sessionAssignedWithLabel",
      "mindNudge",
    ]);
    expect(model.lines).toHaveLength(3);
    expect(model.leadTone).toBe("warn");
    expect(model.leadDomain).toBe("heart");
    expect(model.lines[1].params).toEqual({ label: "Dag A — Squat" });
  });

  it("drops mindLogged when two stronger lines already exist", () => {
    const model = buildTodayProse(
      input({
        hrv: { hasReading: true, qualitative: "lav", outOfBand: true },
        session: { state: "assigned", dayLabel: "Dag A — Squat" },
        mind: { checkedToday: true },
      }),
    );
    expect(keysOf(model)).toEqual(["hrvLav", "sessionAssignedWithLabel"]);
    expect(keysOf(model)).not.toContain("mindLogged");
  });

  it("keeps mindLogged when it is needed to reach two honest lines", () => {
    const model = buildTodayProse(
      input({
        session: { state: "rest", dayLabel: null },
        mind: { checkedToday: true },
      }),
    );
    expect(keysOf(model)).toEqual(["sessionRest", "mindLogged"]);
  });

  it("keeps mindNudge because it is actionable", () => {
    const model = buildTodayProse(
      input({
        session: { state: "rest", dayLabel: null },
        mind: { checkedToday: false },
      }),
    );
    expect(keysOf(model)).toEqual(["mindNudge", "sessionRest"]);
  });
});

describe("buildTodayProse — session states", () => {
  it("assigned without a label uses the generic key", () => {
    const model = buildTodayProse(
      input({ session: { state: "assigned", dayLabel: "   " } }),
    );
    expect(keysOf(model)).toContain("sessionAssigned");
    expect(keysOf(model)).not.toContain("sessionAssignedWithLabel");
  });

  it("done with a label acknowledges the pas", () => {
    const model = buildTodayProse(
      input({ session: { state: "done", dayLabel: "Dag B — Bench" } }),
    );
    expect(keysOf(model)[0]).toBe("sessionDoneWithLabel");
    expect(model.lines[0].params).toEqual({ label: "Dag B — Bench" });
    expect(model.leadTone).toBe("ok");
  });

  it("skipped is honest and quiet", () => {
    const model = buildTodayProse(
      input({
        session: { state: "skipped", dayLabel: null },
        mind: { checkedToday: false },
      }),
    );
    expect(keysOf(model)).toEqual(["sessionSkipped", "mindNudge"]);
    expect(model.lines[0].tone).toBe("quiet");
  });

  it("rest is a real today-signal, not manufactured urgency", () => {
    const model = buildTodayProse(
      input({ session: { state: "rest", dayLabel: null } }),
    );
    expect(keysOf(model)).toContain("sessionRest");
    expect(model.lines[0].tone).toBe("quiet");
  });
});

describe("buildTodayProse — HRV", () => {
  it("does not invent a heart line when there is no reading", () => {
    const model = buildTodayProse(
      input({
        hrv: { hasReading: false, qualitative: "lav", outOfBand: true },
        session: { state: "assigned", dayLabel: "Squat" },
      }),
    );
    expect(keysOf(model)).not.toContain("hrvLav");
    expect(keysOf(model)).not.toContain("hrvRo");
    expect(keysOf(model)).not.toContain("hrvMidt");
  });

  it("hrvRo ranks below assigned but still leads when session is rest", () => {
    const assigned = buildTodayProse(
      input({
        hrv: { hasReading: true, qualitative: "ro" },
        session: { state: "assigned", dayLabel: "Squat" },
        mind: { checkedToday: true },
      }),
    );
    expect(keysOf(assigned)).toEqual(["sessionAssignedWithLabel", "hrvRo"]);

    const rest = buildTodayProse(
      input({
        hrv: { hasReading: true, qualitative: "ro" },
        session: { state: "rest", dayLabel: null },
        mind: { checkedToday: true },
      }),
    );
    expect(keysOf(rest)[0]).toBe("hrvRo");
    expect(rest.leadTone).toBe("ok");
  });

  it("hrvMidt is the weakest heart line", () => {
    const model = buildTodayProse(
      input({
        hrv: { hasReading: true, qualitative: "midt" },
        session: { state: "assigned", dayLabel: "Squat" },
        mind: { checkedToday: false },
      }),
    );
    expect(keysOf(model)).toEqual([
      "sessionAssignedWithLabel",
      "mindNudge",
      "hrvMidt",
    ]);
  });
});

describe("buildTodayProse — never crisis copy", () => {
  it("only emits the known Today keys (no safety / Livslinien surface)", () => {
    const allowed = new Set<TodayProseKey>([
      "hrvLav",
      "hrvRo",
      "hrvMidt",
      "sessionAssigned",
      "sessionAssignedWithLabel",
      "sessionDone",
      "sessionDoneWithLabel",
      "sessionRest",
      "sessionSkipped",
      "mindNudge",
      "mindLogged",
      "quiet",
    ]);
    const samples: TodayProseInput[] = [
      input(),
      input({
        hrv: { hasReading: true, qualitative: "lav", outOfBand: true },
        session: { state: "assigned", dayLabel: "Squat" },
        mind: { checkedToday: false },
      }),
      demoTodayProseInput(),
    ];
    for (const sample of samples) {
      for (const line of buildTodayProse(sample).lines) {
        expect(allowed.has(line.key)).toBe(true);
      }
    }
  });
});

describe("copenhagenTodayIso", () => {
  it("uses Europe/Copenhagen, not UTC, around midnight", () => {
    // 23:30 UTC on 2 Sep = 01:30 CEST on 3 Sep.
    expect(copenhagenTodayIso(new Date("2026-09-02T23:30:00.000Z"))).toBe(
      "2026-09-03",
    );
    expect(copenhagenTodayIso(new Date("2026-09-03T00:00:00.000Z"))).toBe(
      "2026-09-03",
    );
  });
});

describe("demoTodayProseInput", () => {
  it("matches MUNK-01 fixtures: lav HRV + labelled squat, no mindLogged dump", () => {
    const fixture = demoTodayProseInput();
    expect(fixture.hrv.hasReading).toBe(true);
    expect(fixture.hrv.qualitative).toBe("lav");
    expect(fixture.hrv.outOfBand).toBe(true);
    expect(fixture.session.state).toBe("assigned");
    expect(fixture.session.dayLabel).toMatch(/Squat/i);
    expect(fixture.mind.checkedToday).toBe(true);

    const model = buildTodayProse(fixture);
    expect(keysOf(model)).toEqual(["hrvLav", "sessionAssignedWithLabel"]);
    expect(model.leadDomain).toBe("heart");
    expect(model.leadTone).toBe("warn");
  });
});
