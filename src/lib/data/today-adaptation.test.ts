import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/env", () => ({ SUPABASE_ENABLED: false }));

import { getTodayAdaptation } from "./today-adaptation";

describe("getTodayAdaptation", () => {
  it("returns null without a session today", async () => {
    expect(await getTodayAdaptation("m1", null)).toBeNull();
  });

  it("returns the explainer scenario in demo so Munk can demo the flow", async () => {
    const a = await getTodayAdaptation("m1", "demo-session");
    expect(a?.modifierId).toBeTruthy();
    expect(a?.acceptedByMember).toBeNull();
    expect(a?.modifierType).toBe(a?.ruleDecision?.action);
    expect(a?.explanationDa).toBeTruthy();
  });
});
