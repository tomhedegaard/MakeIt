/**
 * MakeIt Ung, del 1 — contract tests for the parts that must not drift:
 * the database guard, the app gate and the handling of the token.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const MIGRATION = read("../../../supabase/migrations/0063_makeit_ung.sql");
const LAYOUT = read("../../app/(app)/layout.tsx");
const ONBOARDING = read("../../app/onboarding/layout.tsx");
const SERVER = read("./guardianship.ts");

describe("database (0063)", () => {
  it("lets clients read their own guardianships but never write them", () => {
    expect(MIGRATION).toMatch(/for select to authenticated\s+using \(guardian_member_id = auth\.uid\(\)\)/);
    expect(MIGRATION).toMatch(/for select to authenticated\s+using \(youth_member_id = auth\.uid\(\)\)/);
    expect(MIGRATION).not.toMatch(/on public\.guardianships for (insert|update|delete|all)/);
  });

  it("adds account_type to the privilege guard, so a young member cannot become adult", () => {
    expect(MIGRATION).toMatch(/new\.account_type\s+is distinct from old\.account_type/);
  });

  it("keeps the birth date off the widely readable members table", () => {
    const membersAlter = MIGRATION.slice(MIGRATION.indexOf("alter table public.members"), MIGRATION.indexOf(";", MIGRATION.indexOf("alter table public.members")));
    expect(membersAlter).not.toContain("birth_date");
    expect(MIGRATION).toMatch(/youth_birth_date\s+date not null/);
  });
});

describe("app gate", () => {
  it("gives a young account the youth shell before any onboarding redirect", () => {
    expect(LAYOUT.indexOf("youthClaimsFor(member.id)")).toBeGreaterThan(-1);
    expect(LAYOUT.indexOf("youthClaimsFor(member.id)")).toBeLessThan(LAYOUT.indexOf('redirect("/onboarding")'));
    expect(LAYOUT).toContain("<AppShell member={member} youth={youth}>");
  });

  it("enforces the youth routes in middleware from server-written app_metadata", () => {
    const mw = read("../../middleware.ts");
    expect(mw).toContain("youthClaims(user.app_metadata)");
    expect(mw).toMatch(/claims\.youth && !youthMayOpen\(/);
    expect(SERVER).toMatch(/app_metadata: \{\s*account_type: "youth"/);
  });

  it("keeps a young account out of the adult onboarding", () => {
    expect(ONBOARDING).toMatch(/isYouthAccount\(member\.id\)\)\) redirect\("\/dashboard"\)/);
  });
});

describe("invitation token", () => {
  it("is only stored and looked up as a hash", () => {
    expect(SERVER).toMatch(/invite_token_hash: hashInviteToken\(token\)/);
    expect(SERVER).toMatch(/\.eq\("invite_token_hash", hashInviteToken\(token\)\)/);
    expect(SERVER).not.toMatch(/invite_token:\s/);
  });

  it("removes a half-made young account if the second write fails", () => {
    expect(SERVER).toMatch(/if \(memberErr \|\| gErr\) \{[\s\S]*?deleteUser\(youthId\)/);
  });

  it("deletes the young account when the guardian ends MakeIt Ung", () => {
    expect(SERVER).toMatch(/endGuardianship[\s\S]*?auth\.admin\.deleteUser\(g\.youth_member_id\)/);
  });
});
