import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => null }));

import { mockWeekStrip } from "./coaching";

describe("mockWeekStrip", () => {
  it("puts Squat on today, matching the demo Today card, with earlier sessions done", () => {
    // Sun 1 Nov 2026, midday Copenhagen.
    const week = mockWeekStrip(new Date("2026-11-01T11:00:00Z"));
    const today = week.find((d) => d.today)!;
    expect(today.dayKey).toBe("sun");
    expect(today.sessionLabel).toBe("Squat");
    expect(today.rest).toBe(false);
    expect(week.map((d) => d.sessionLabel)).toEqual(["Push", "Pull", "Deadlift", "Hyper", "", "", "Squat"]);
    expect(week.filter((d) => d.done).map((d) => d.dayKey)).toEqual(["mon", "tue", "wed", "thu"]);
  });

  it("runs the rotation forward from a Monday", () => {
    const week = mockWeekStrip(new Date("2026-11-02T11:00:00Z"));
    expect(week.map((d) => d.sessionLabel)).toEqual(["Squat", "Push", "Pull", "Deadlift", "Hyper", "", ""]);
    expect(week.some((d) => d.done)).toBe(false);
  });
});
