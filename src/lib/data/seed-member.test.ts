import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ensureMemberStarter, memberStarterWrites } from "./seed-member";

const SRC = readFileSync(new URL("./seed-member.ts", import.meta.url), "utf8");

describe("ensureMemberStarter", () => {
  it("is a no-op and never plans writes", async () => {
    expect(memberStarterWrites()).toEqual([]);
    await expect(ensureMemberStarter("member-testy")).resolves.toBeUndefined();
  });

  it("does not write STR-12 week 4 or fabricated sessions", () => {
    expect(SRC).not.toMatch(/current_week:\s*4/);
    expect(SRC).not.toMatch(/from\("sessions"\)/);
    expect(SRC).not.toMatch(/from\("program_assignments"\)/);
    expect(SRC).not.toMatch(/from\("session_exercises"\)/);
    expect(SRC).not.toMatch(/from\("session_sets"\)/);
    expect(SRC).not.toMatch(/createClient/);
  });
});
