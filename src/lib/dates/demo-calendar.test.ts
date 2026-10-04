import { describe, expect, it } from "vitest";
import { demoCalendar, meetLabel, monthName } from "./demo-calendar";

describe("demoCalendar", () => {
  it("follows today: current month, days left, a Saturday 3+ weeks out", () => {
    const now = new Date(2026, 9, 4); // Sun 4 Oct 2026
    const cal = demoCalendar(now);
    expect(monthName(cal.month, "da-DK")).toBe("oktober");
    expect(cal.daysLeft).toBe(27);
    expect(cal.meet.getDay()).toBe(6);
    expect(cal.meet.getTime() - now.getTime()).toBeGreaterThanOrEqual(21 * 86_400_000);
    expect(meetLabel(cal.meet, "da-DK")).toBe("Lørdag 31/10");
  });
});
