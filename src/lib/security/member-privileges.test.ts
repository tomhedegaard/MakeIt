/**
 * Contract for migration 0062: privileged member columns are not
 * client-writable, and every legitimate writer uses a server role.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const MIGRATION = read("../../../supabase/migrations/0062_protect_member_privileges.sql");

describe("members privilege columns (0062)", () => {
  it.each(["id", "is_coach", "is_admin", "coach_tier", "tier", "stripe_customer_id"])(
    "guards %s against client updates",
    (col) => {
      expect(MIGRATION).toMatch(new RegExp(`new\\.${col}\\s+is distinct from old\\.${col}`));
    },
  );

  it("lets only server roles through, like the 0059 invite guard", () => {
    expect(MIGRATION).toContain("current_user in ('postgres', 'supabase_admin', 'service_role')");
    expect(MIGRATION).toMatch(/before update on public\.members/);
  });

  it("billing writes the Stripe customer id with the service-role client", () => {
    const billing = read("../../app/(app)/billing/actions.ts");
    expect(billing).toMatch(/createServiceClient\(\)\s*\.from\("members"\)\s*\.update\(\{ stripe_customer_id/);
  });

  it("coach-school writes coach_tier with the service-role client", () => {
    expect(read("../../app/(app)/coach-school/actions.ts")).toMatch(/await svc\s*\.from\("members"\)\s*\.update\(\{ coach_tier: "beast_live" \}\)/);
    expect(read("../data/coach-school-quality.ts")).toMatch(/await svc\s*\.from\("members"\)\s*\.update\(\{ coach_tier: "beast_sandbox" \}\)/);
  });
});
