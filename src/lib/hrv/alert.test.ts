import { describe, it, expect } from "vitest";
import {
  evaluateAlertConditions,
  type AlertInput,
  type AlertReading,
  type AlertLog,
} from "./alert";

/**
 * Helper — produce a `YYYY-MM-DD` string `n` days before `from` (default
 * `now`). Used to anchor reading/log dates relative to `now` in the tests.
 */
const MS_PER_DAY = 86_400_000;
const dayBefore = (from: Date, n: number): string =>
  new Date(from.getTime() - n * MS_PER_DAY).toISOString().slice(0, 10);

/** Build a "perfect storm" input — all four conditions truthy. */
function allFourTruthy(now: Date): AlertInput {
  const readings: AlertReading[] = [];
  // 30 baseline readings (days 8..37 inclusive), resting HR mean 55
  for (let i = 8; i < 38; i++) {
    readings.push({
      date: dayBefore(now, i),
      warmUpState: "active",
      rolling7dMeanLnRmssd: 4.0,
      baseline60dMeanLnRmssd: 4.0,
      baseline60dSwc: 0.1,
      restingHrBpm: 55,
    });
  }
  // 5 exposed readings (last 7 days) with low rolling-7d and high RHR
  for (let i = 0; i < 5; i++) {
    readings.push({
      date: dayBefore(now, i),
      warmUpState: "active",
      rolling7dMeanLnRmssd: 3.5, // 3.5 < 4.0 - 0.1 = 3.9 → low
      baseline60dMeanLnRmssd: 4.0,
      baseline60dSwc: 0.1,
      restingHrBpm: 62,
    });
  }
  readings.sort((a, b) => a.date.localeCompare(b.date));
  const lifestyleLogs: AlertLog[] = [
    { date: dayBefore(now, 1), eventType: "sick", value: { sick: true } },
  ];
  return { readings, lifestyleLogs, now };
}

const now = new Date("2026-05-20T08:00:00Z");
const today = now.toISOString().slice(0, 10);

describe("evaluateAlertConditions — warm_up_active", () => {
  it("is true when the latest reading is active", () => {
    const result = evaluateAlertConditions({
      readings: [
        {
          date: today,
          warmUpState: "active",
          rolling7dMeanLnRmssd: null,
          baseline60dMeanLnRmssd: null,
          baseline60dSwc: null,
          restingHrBpm: null,
        },
      ],
      lifestyleLogs: [],
      now,
    });
    expect(result.conditions_met.warm_up_active).toBe(true);
  });

  it("is false when the latest reading is provisional", () => {
    const result = evaluateAlertConditions({
      readings: [
        {
          date: today,
          warmUpState: "provisional",
          rolling7dMeanLnRmssd: null,
          baseline60dMeanLnRmssd: null,
          baseline60dSwc: null,
          restingHrBpm: null,
        },
      ],
      lifestyleLogs: [],
      now,
    });
    expect(result.conditions_met.warm_up_active).toBe(false);
  });

  it("is false when there are no readings", () => {
    const result = evaluateAlertConditions({
      readings: [],
      lifestyleLogs: [],
      now,
    });
    expect(result.conditions_met.warm_up_active).toBe(false);
  });
});

describe("evaluateAlertConditions — sustained_low_readiness", () => {
  it("reports 3 consecutive low days", () => {
    const readings: AlertReading[] = [];
    // 3 low days = the most recent 3
    for (let i = 0; i < 3; i++) {
      readings.push({
        date: dayBefore(now, i),
        warmUpState: "active",
        rolling7dMeanLnRmssd: 3.5,
        baseline60dMeanLnRmssd: 4.0,
        baseline60dSwc: 0.1,
        restingHrBpm: null,
      });
    }
    // and a non-low day before that
    readings.push({
      date: dayBefore(now, 3),
      warmUpState: "active",
      rolling7dMeanLnRmssd: 4.2,
      baseline60dMeanLnRmssd: 4.0,
      baseline60dSwc: 0.1,
      restingHrBpm: null,
    });
    const result = evaluateAlertConditions({
      readings,
      lifestyleLogs: [],
      now,
    });
    expect(result.conditions_met.sustained_low_readiness).toEqual({
      consecutive_days_low: 3,
    });
  });

  it("reports the full run length on a 5-day streak (not capped at 3)", () => {
    const readings: AlertReading[] = [];
    for (let i = 0; i < 5; i++) {
      readings.push({
        date: dayBefore(now, i),
        warmUpState: "active",
        rolling7dMeanLnRmssd: 3.5,
        baseline60dMeanLnRmssd: 4.0,
        baseline60dSwc: 0.1,
        restingHrBpm: null,
      });
    }
    readings.push({
      date: dayBefore(now, 5),
      warmUpState: "active",
      rolling7dMeanLnRmssd: 4.2,
      baseline60dMeanLnRmssd: 4.0,
      baseline60dSwc: 0.1,
      restingHrBpm: null,
    });
    const result = evaluateAlertConditions({
      readings,
      lifestyleLogs: [],
      now,
    });
    expect(result.conditions_met.sustained_low_readiness).toEqual({
      consecutive_days_low: 5,
    });
  });

  it("reports 0 when the most recent day is non-low (broken streak)", () => {
    const readings: AlertReading[] = [
      // Most recent: non-low
      {
        date: dayBefore(now, 0),
        warmUpState: "active",
        rolling7dMeanLnRmssd: 4.2,
        baseline60dMeanLnRmssd: 4.0,
        baseline60dSwc: 0.1,
        restingHrBpm: null,
      },
      // older: 2 low days
      {
        date: dayBefore(now, 1),
        warmUpState: "active",
        rolling7dMeanLnRmssd: 3.5,
        baseline60dMeanLnRmssd: 4.0,
        baseline60dSwc: 0.1,
        restingHrBpm: null,
      },
      {
        date: dayBefore(now, 2),
        warmUpState: "active",
        rolling7dMeanLnRmssd: 3.5,
        baseline60dMeanLnRmssd: 4.0,
        baseline60dSwc: 0.1,
        restingHrBpm: null,
      },
    ];
    const result = evaluateAlertConditions({
      readings,
      lifestyleLogs: [],
      now,
    });
    expect(result.conditions_met.sustained_low_readiness).toEqual({
      consecutive_days_low: 0,
    });
  });

  it("reports 2 when only 2 most recent are low and 3rd is non-low", () => {
    const readings: AlertReading[] = [
      {
        date: dayBefore(now, 0),
        warmUpState: "active",
        rolling7dMeanLnRmssd: 3.5,
        baseline60dMeanLnRmssd: 4.0,
        baseline60dSwc: 0.1,
        restingHrBpm: null,
      },
      {
        date: dayBefore(now, 1),
        warmUpState: "active",
        rolling7dMeanLnRmssd: 3.5,
        baseline60dMeanLnRmssd: 4.0,
        baseline60dSwc: 0.1,
        restingHrBpm: null,
      },
      {
        date: dayBefore(now, 2),
        warmUpState: "active",
        rolling7dMeanLnRmssd: 4.2,
        baseline60dMeanLnRmssd: 4.0,
        baseline60dSwc: 0.1,
        restingHrBpm: null,
      },
    ];
    const result = evaluateAlertConditions({
      readings,
      lifestyleLogs: [],
      now,
    });
    expect(result.conditions_met.sustained_low_readiness).toEqual({
      consecutive_days_low: 2,
    });
  });

  it("breaks the run when a recent reading has a null baseline column", () => {
    const readings: AlertReading[] = [
      {
        date: dayBefore(now, 0),
        warmUpState: "active",
        rolling7dMeanLnRmssd: 3.5,
        baseline60dMeanLnRmssd: 4.0,
        baseline60dSwc: 0.1,
        restingHrBpm: null,
      },
      {
        date: dayBefore(now, 1),
        warmUpState: "active",
        rolling7dMeanLnRmssd: 3.5,
        baseline60dMeanLnRmssd: null, // ← null breaks the run
        baseline60dSwc: 0.1,
        restingHrBpm: null,
      },
      {
        date: dayBefore(now, 2),
        warmUpState: "active",
        rolling7dMeanLnRmssd: 3.5,
        baseline60dMeanLnRmssd: 4.0,
        baseline60dSwc: 0.1,
        restingHrBpm: null,
      },
    ];
    const result = evaluateAlertConditions({
      readings,
      lifestyleLogs: [],
      now,
    });
    expect(result.conditions_met.sustained_low_readiness).toEqual({
      consecutive_days_low: 1,
    });
  });

  it("returns null with fewer than 3 readings in the window", () => {
    const readings: AlertReading[] = [
      {
        date: dayBefore(now, 0),
        warmUpState: "active",
        rolling7dMeanLnRmssd: 3.5,
        baseline60dMeanLnRmssd: 4.0,
        baseline60dSwc: 0.1,
        restingHrBpm: null,
      },
      {
        date: dayBefore(now, 1),
        warmUpState: "active",
        rolling7dMeanLnRmssd: 3.5,
        baseline60dMeanLnRmssd: 4.0,
        baseline60dSwc: 0.1,
        restingHrBpm: null,
      },
    ];
    const result = evaluateAlertConditions({
      readings,
      lifestyleLogs: [],
      now,
    });
    expect(result.conditions_met.sustained_low_readiness).toBeNull();
  });

  it("dedupes by date (last reading per day wins)", () => {
    // Two readings on the same date — the latest in the array (non-low) wins.
    const readings: AlertReading[] = [
      {
        date: dayBefore(now, 0),
        warmUpState: "active",
        rolling7dMeanLnRmssd: 3.5,
        baseline60dMeanLnRmssd: 4.0,
        baseline60dSwc: 0.1,
        restingHrBpm: null,
      },
      {
        date: dayBefore(now, 0), // duplicate, but non-low — wins
        warmUpState: "active",
        rolling7dMeanLnRmssd: 4.5,
        baseline60dMeanLnRmssd: 4.0,
        baseline60dSwc: 0.1,
        restingHrBpm: null,
      },
      {
        date: dayBefore(now, 1),
        warmUpState: "active",
        rolling7dMeanLnRmssd: 3.5,
        baseline60dMeanLnRmssd: 4.0,
        baseline60dSwc: 0.1,
        restingHrBpm: null,
      },
      {
        date: dayBefore(now, 2),
        warmUpState: "active",
        rolling7dMeanLnRmssd: 3.5,
        baseline60dMeanLnRmssd: 4.0,
        baseline60dSwc: 0.1,
        restingHrBpm: null,
      },
    ];
    const result = evaluateAlertConditions({
      readings,
      lifestyleLogs: [],
      now,
    });
    expect(result.conditions_met.sustained_low_readiness).toEqual({
      consecutive_days_low: 0,
    });
  });
});

describe("evaluateAlertConditions — rhr_spike", () => {
  it("reports +13% with 14 baseline & 3 exposed samples", () => {
    const readings: AlertReading[] = [];
    // 14 baseline readings outside the last 7 days (days 7..20), mean 55
    for (let i = 7; i < 21; i++) {
      readings.push({
        date: dayBefore(now, i),
        warmUpState: "active",
        rolling7dMeanLnRmssd: null,
        baseline60dMeanLnRmssd: null,
        baseline60dSwc: null,
        restingHrBpm: 55,
      });
    }
    // 3 exposed readings in last 7 days, mean 62
    for (let i = 0; i < 3; i++) {
      readings.push({
        date: dayBefore(now, i),
        warmUpState: "active",
        rolling7dMeanLnRmssd: null,
        baseline60dMeanLnRmssd: null,
        baseline60dSwc: null,
        restingHrBpm: 62,
      });
    }
    const result = evaluateAlertConditions({
      readings,
      lifestyleLogs: [],
      now,
    });
    expect(result.conditions_met.rhr_spike).toEqual({
      exposed_mean: 62,
      baseline_mean: 55,
      delta_pct: 13,
    });
  });

  it("populates object but stays falsy when delta < 10%", () => {
    const readings: AlertReading[] = [];
    for (let i = 7; i < 21; i++) {
      readings.push({
        date: dayBefore(now, i),
        warmUpState: "active",
        rolling7dMeanLnRmssd: null,
        baseline60dMeanLnRmssd: null,
        baseline60dSwc: null,
        restingHrBpm: 55,
      });
    }
    for (let i = 0; i < 3; i++) {
      readings.push({
        date: dayBefore(now, i),
        warmUpState: "active",
        rolling7dMeanLnRmssd: null,
        baseline60dMeanLnRmssd: null,
        baseline60dSwc: null,
        restingHrBpm: 60, // delta = ~9%
      });
    }
    const result = evaluateAlertConditions({
      readings,
      lifestyleLogs: [],
      now,
    });
    expect(result.conditions_met.rhr_spike).toEqual({
      exposed_mean: 60,
      baseline_mean: 55,
      delta_pct: 9,
    });
    // multiplicative gate: 60 < 1.10 * 55 = 60.5 — falsy
    expect(result.triggered).toBe(false);
  });

  it("returns null with only 13 baseline RHR samples", () => {
    const readings: AlertReading[] = [];
    for (let i = 7; i < 20; i++) {
      // 13 samples
      readings.push({
        date: dayBefore(now, i),
        warmUpState: "active",
        rolling7dMeanLnRmssd: null,
        baseline60dMeanLnRmssd: null,
        baseline60dSwc: null,
        restingHrBpm: 55,
      });
    }
    for (let i = 0; i < 3; i++) {
      readings.push({
        date: dayBefore(now, i),
        warmUpState: "active",
        rolling7dMeanLnRmssd: null,
        baseline60dMeanLnRmssd: null,
        baseline60dSwc: null,
        restingHrBpm: 62,
      });
    }
    const result = evaluateAlertConditions({
      readings,
      lifestyleLogs: [],
      now,
    });
    expect(result.conditions_met.rhr_spike).toBeNull();
  });

  it("returns null with only 2 exposed RHR samples", () => {
    const readings: AlertReading[] = [];
    for (let i = 7; i < 21; i++) {
      readings.push({
        date: dayBefore(now, i),
        warmUpState: "active",
        rolling7dMeanLnRmssd: null,
        baseline60dMeanLnRmssd: null,
        baseline60dSwc: null,
        restingHrBpm: 55,
      });
    }
    for (let i = 0; i < 2; i++) {
      readings.push({
        date: dayBefore(now, i),
        warmUpState: "active",
        rolling7dMeanLnRmssd: null,
        baseline60dMeanLnRmssd: null,
        baseline60dSwc: null,
        restingHrBpm: 62,
      });
    }
    const result = evaluateAlertConditions({
      readings,
      lifestyleLogs: [],
      now,
    });
    expect(result.conditions_met.rhr_spike).toBeNull();
  });

  it("returns null when every restingHrBpm is null", () => {
    const readings: AlertReading[] = [];
    for (let i = 0; i < 30; i++) {
      readings.push({
        date: dayBefore(now, i),
        warmUpState: "active",
        rolling7dMeanLnRmssd: null,
        baseline60dMeanLnRmssd: null,
        baseline60dSwc: null,
        restingHrBpm: null,
      });
    }
    const result = evaluateAlertConditions({
      readings,
      lifestyleLogs: [],
      now,
    });
    expect(result.conditions_met.rhr_spike).toBeNull();
  });

  it("baseline-excludes-exposed: a reading dated windowStart7 lands in EXPOSED, windowStart7-1 lands in BASELINE", () => {
    // windowStart7 = today - 6, so dayBefore(now, 6) is the boundary.
    const readings: AlertReading[] = [];
    // 14 baseline readings on days [7..20] (clearly inside [windowStart60, windowStart7))
    for (let i = 7; i < 21; i++) {
      readings.push({
        date: dayBefore(now, i),
        warmUpState: "active",
        rolling7dMeanLnRmssd: null,
        baseline60dMeanLnRmssd: null,
        baseline60dSwc: null,
        restingHrBpm: 50,
      });
    }
    // Plus the boundary day itself (windowStart7 - 1 = day 7) is already 50.
    // The boundary day dayBefore(now, 6) (= windowStart7) should land in EXPOSED.
    readings.push({
      date: dayBefore(now, 6), // == windowStart7
      warmUpState: "active",
      rolling7dMeanLnRmssd: null,
      baseline60dMeanLnRmssd: null,
      baseline60dSwc: null,
      restingHrBpm: 80, // pulls exposed mean up
    });
    // Two more exposed (so exposed.length === 3)
    readings.push({
      date: dayBefore(now, 0),
      warmUpState: "active",
      rolling7dMeanLnRmssd: null,
      baseline60dMeanLnRmssd: null,
      baseline60dSwc: null,
      restingHrBpm: 80,
    });
    readings.push({
      date: dayBefore(now, 1),
      warmUpState: "active",
      rolling7dMeanLnRmssd: null,
      baseline60dMeanLnRmssd: null,
      baseline60dSwc: null,
      restingHrBpm: 80,
    });
    const result = evaluateAlertConditions({
      readings,
      lifestyleLogs: [],
      now,
    });
    // baseline_mean is from days 7..20 only (14 readings × 50 bpm)
    expect(result.conditions_met.rhr_spike).not.toBeNull();
    expect(result.conditions_met.rhr_spike!.baseline_mean).toBe(50);
    // exposed_mean is from the 3 exposed readings (all 80)
    expect(result.conditions_met.rhr_spike!.exposed_mean).toBe(80);
  });
});

describe("evaluateAlertConditions — lifestyle_flags", () => {
  it("flags sick=true on a sick:{sick:true} log in window", () => {
    const result = evaluateAlertConditions({
      readings: [],
      lifestyleLogs: [
        {
          date: dayBefore(now, 2),
          eventType: "sick",
          value: { sick: true },
        },
      ],
      now,
    });
    expect(result.conditions_met.lifestyle_flags.sick).toBe(true);
  });

  it("flags stressed=true on feeling:{state:'stressed'}", () => {
    const result = evaluateAlertConditions({
      readings: [],
      lifestyleLogs: [
        {
          date: dayBefore(now, 2),
          eventType: "feeling",
          value: { state: "stressed" },
        },
      ],
      now,
    });
    expect(result.conditions_met.lifestyle_flags.stressed).toBe(true);
  });

  it("does not flag stressed for tired/ok/fresh feeling states", () => {
    const states = ["tired", "ok", "fresh"];
    for (const state of states) {
      const result = evaluateAlertConditions({
        readings: [],
        lifestyleLogs: [
          {
            date: dayBefore(now, 2),
            eventType: "feeling",
            value: { state },
          },
        ],
        now,
      });
      expect(result.conditions_met.lifestyle_flags.stressed).toBe(false);
    }
  });

  it("flags short_sleep when most recent sleep_hours.hours < 6", () => {
    const result = evaluateAlertConditions({
      readings: [],
      lifestyleLogs: [
        {
          date: dayBefore(now, 3),
          eventType: "sleep_hours",
          value: { hours: 7 },
        },
        {
          date: dayBefore(now, 1),
          eventType: "sleep_hours",
          value: { hours: 5.5 },
        },
      ],
      now,
    });
    expect(result.conditions_met.lifestyle_flags.short_sleep).toBe(true);
  });

  it("does not flag short_sleep when most recent sleep_hours.hours >= 6", () => {
    const result = evaluateAlertConditions({
      readings: [],
      lifestyleLogs: [
        {
          date: dayBefore(now, 1),
          eventType: "sleep_hours",
          value: { hours: 7 },
        },
      ],
      now,
    });
    expect(result.conditions_met.lifestyle_flags.short_sleep).toBe(false);
  });

  it("does not flag short_sleep when there is no sleep_hours log", () => {
    const result = evaluateAlertConditions({
      readings: [],
      lifestyleLogs: [],
      now,
    });
    expect(result.conditions_met.lifestyle_flags.short_sleep).toBe(false);
  });

  it("flags high_alcohol when summed counts across last 7 days >= 3", () => {
    const result = evaluateAlertConditions({
      readings: [],
      lifestyleLogs: [
        {
          date: dayBefore(now, 0),
          eventType: "alcohol_drinks",
          value: { count: 1 },
        },
        {
          date: dayBefore(now, 2),
          eventType: "alcohol_drinks",
          value: { count: 1 },
        },
        {
          date: dayBefore(now, 4),
          eventType: "alcohol_drinks",
          value: { count: 1 },
        },
      ],
      now,
    });
    expect(result.conditions_met.lifestyle_flags.high_alcohol).toBe(true);
  });

  it("does not flag high_alcohol when summed counts < 3", () => {
    const result = evaluateAlertConditions({
      readings: [],
      lifestyleLogs: [
        {
          date: dayBefore(now, 0),
          eventType: "alcohol_drinks",
          value: { count: 1 },
        },
        {
          date: dayBefore(now, 2),
          eventType: "alcohol_drinks",
          value: { count: 1 },
        },
      ],
      now,
    });
    expect(result.conditions_met.lifestyle_flags.high_alcohol).toBe(false);
  });

  it("does not flag high_alcohol when there are no alcohol logs", () => {
    const result = evaluateAlertConditions({
      readings: [],
      lifestyleLogs: [],
      now,
    });
    expect(result.conditions_met.lifestyle_flags.high_alcohol).toBe(false);
  });

  it("flags high_alcohol from a single count:3 log", () => {
    const result = evaluateAlertConditions({
      readings: [],
      lifestyleLogs: [
        {
          date: dayBefore(now, 1),
          eventType: "alcohol_drinks",
          value: { count: 3 },
        },
      ],
      now,
    });
    expect(result.conditions_met.lifestyle_flags.high_alcohol).toBe(true);
  });

  it("always returns a lifestyle_flags object (never null) with all-false sub-flags", () => {
    const result = evaluateAlertConditions({
      readings: [],
      lifestyleLogs: [],
      now,
    });
    expect(result.conditions_met.lifestyle_flags).toEqual({
      sick: false,
      stressed: false,
      short_sleep: false,
      high_alcohol: false,
    });
  });
});

describe("evaluateAlertConditions — server-date calendar windows", () => {
  it("last-7-days window is inclusive: today and today-6 both included; today-7 excluded", () => {
    const result = evaluateAlertConditions({
      readings: [],
      lifestyleLogs: [
        {
          date: dayBefore(now, 6), // windowStart7 — included
          eventType: "sick",
          value: { sick: true },
        },
      ],
      now,
    });
    expect(result.conditions_met.lifestyle_flags.sick).toBe(true);

    const result2 = evaluateAlertConditions({
      readings: [],
      lifestyleLogs: [
        {
          date: dayBefore(now, 7), // outside window
          eventType: "sick",
          value: { sick: true },
        },
      ],
      now,
    });
    expect(result2.conditions_met.lifestyle_flags.sick).toBe(false);
  });

  it("last-60-days window includes today-59 but excludes today-60", () => {
    // Build 14 baseline RHR readings on day 59 (the last day of the 60-day
    // window) and confirm rhr_spike sees them; a 60-day-old reading is
    // excluded.
    const readings: AlertReading[] = [];
    for (let i = 0; i < 13; i++) {
      readings.push({
        date: dayBefore(now, 8 + i), // days 8..20 inside window
        warmUpState: "active",
        rolling7dMeanLnRmssd: null,
        baseline60dMeanLnRmssd: null,
        baseline60dSwc: null,
        restingHrBpm: 55,
      });
    }
    // The boundary day at exactly -59 (windowStart60) must be included.
    readings.push({
      date: dayBefore(now, 59),
      warmUpState: "active",
      rolling7dMeanLnRmssd: null,
      baseline60dMeanLnRmssd: null,
      baseline60dSwc: null,
      restingHrBpm: 55,
    });
    // A reading at -60 must NOT count.
    readings.push({
      date: dayBefore(now, 60),
      warmUpState: "active",
      rolling7dMeanLnRmssd: null,
      baseline60dMeanLnRmssd: null,
      baseline60dSwc: null,
      restingHrBpm: 200,
    });
    // exposed
    for (let i = 0; i < 3; i++) {
      readings.push({
        date: dayBefore(now, i),
        warmUpState: "active",
        rolling7dMeanLnRmssd: null,
        baseline60dMeanLnRmssd: null,
        baseline60dSwc: null,
        restingHrBpm: 62,
      });
    }
    const result = evaluateAlertConditions({
      readings,
      lifestyleLogs: [],
      now,
    });
    expect(result.conditions_met.rhr_spike).not.toBeNull();
    // baseline_mean should be 55 — the day-60 reading must be excluded.
    expect(result.conditions_met.rhr_spike!.baseline_mean).toBe(55);
  });
});

describe("evaluateAlertConditions — triggered gate", () => {
  it("is true when all four conditions are truthy", () => {
    const result = evaluateAlertConditions(allFourTruthy(now));
    expect(result.conditions_met.warm_up_active).toBe(true);
    expect(result.conditions_met.sustained_low_readiness).not.toBeNull();
    expect(
      result.conditions_met.sustained_low_readiness!.consecutive_days_low,
    ).toBeGreaterThanOrEqual(3);
    expect(result.conditions_met.rhr_spike).not.toBeNull();
    expect(
      result.conditions_met.rhr_spike!.exposed_mean >=
        1.1 * result.conditions_met.rhr_spike!.baseline_mean,
    ).toBe(true);
    expect(result.conditions_met.lifestyle_flags.sick).toBe(true);
    expect(result.triggered).toBe(true);
  });

  it("is false when only three conditions are truthy (no lifestyle flag)", () => {
    const input = allFourTruthy(now);
    input.lifestyleLogs = [];
    const result = evaluateAlertConditions(input);
    expect(result.triggered).toBe(false);
  });

  it("is false when consecutive_days_low === 2 (object present but < 3)", () => {
    const input = allFourTruthy(now);
    // Replace readings so most recent two are low and 3rd is non-low.
    input.readings = [];
    // 30 baseline RHR readings (days 8..37) with mean 55
    for (let i = 8; i < 38; i++) {
      input.readings.push({
        date: dayBefore(now, i),
        warmUpState: "active",
        rolling7dMeanLnRmssd: 4.0,
        baseline60dMeanLnRmssd: 4.0,
        baseline60dSwc: 0.1,
        restingHrBpm: 55,
      });
    }
    // Two recent low days
    for (let i = 0; i < 2; i++) {
      input.readings.push({
        date: dayBefore(now, i),
        warmUpState: "active",
        rolling7dMeanLnRmssd: 3.5,
        baseline60dMeanLnRmssd: 4.0,
        baseline60dSwc: 0.1,
        restingHrBpm: 62,
      });
    }
    // One non-low day at index 2
    input.readings.push({
      date: dayBefore(now, 2),
      warmUpState: "active",
      rolling7dMeanLnRmssd: 4.2,
      baseline60dMeanLnRmssd: 4.0,
      baseline60dSwc: 0.1,
      restingHrBpm: 62,
    });
    // Need 3 exposed RHR samples — already have days 0,1,2 → 3 samples.
    const result = evaluateAlertConditions(input);
    expect(
      result.conditions_met.sustained_low_readiness!.consecutive_days_low,
    ).toBe(2);
    expect(result.triggered).toBe(false);
  });

  it("is false when rhr_spike is null (fail-closed) even if other conditions hold", () => {
    const input = allFourTruthy(now);
    // Strip all restingHrBpm values → rhr_spike becomes null
    input.readings = input.readings.map((r) => ({ ...r, restingHrBpm: null }));
    const result = evaluateAlertConditions(input);
    expect(result.conditions_met.rhr_spike).toBeNull();
    expect(result.triggered).toBe(false);
  });
});
