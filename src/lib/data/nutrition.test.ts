import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/env", () => ({ SUPABASE_ENABLED: false }));

import { getCurrentPlan, getPlanForWeek } from "./nutrition";

describe("getPlanForWeek / getCurrentPlan — demo mode", () => {
  it("returns a mock plan for the requested week instead of null", async () => {
    const plan = await getPlanForWeek("demo-member", "2026-09-14");
    expect(plan).not.toBeNull();
    expect(plan?.weekStart).toBe("2026-09-14");
    expect(plan?.generator).toBe("mock");
    expect(plan?.meals.length).toBeGreaterThan(0);
    expect(plan?.dailyKcal).toBeGreaterThan(0);
  });

  it("is deterministic — same member + week yields the same plan", async () => {
    const a = await getPlanForWeek("demo-member", "2026-09-14");
    const b = await getPlanForWeek("demo-member", "2026-09-14");
    expect(a).toEqual(b);
  });

  it("getCurrentPlan resolves to the current ISO week's mock plan", async () => {
    const plan = await getCurrentPlan("demo-member");
    expect(plan).not.toBeNull();
    expect(plan?.id).toMatch(/^demo-\d{4}-\d{2}-\d{2}$/);
  });
});
