/**
 * MakeIt Ung, del 3 — contract tests for the guarantees in spec afsnit 5:
 * the young member sees every notice, the guardian never sees what the
 * young member wrote, and there is no coach contact with minors.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import daYouth from "../../../messages/da/Youth.json";
import enYouth from "../../../messages/en/Youth.json";
import type { NoticeSignal } from "./signals";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const MIGRATION = read("../../../supabase/migrations/0065_guardian_notices.sql");
const NOTICES = read("./notices.ts");
const JOURNAL_ACTION = read("../../app/(app)/mind/journal/actions.ts");
const ESCALATE_ACTION = read("../../app/(app)/mind/journal/escalate-actions.ts");
const MODAL = read("../../components/mind/MentalResourcesModal.tsx");
const TODAY = read("../../components/youth/YouthToday.tsx");
const ACK = read("../../components/youth/actions.ts");
const VERCEL = JSON.parse(read("../../../vercel.json")) as { crons: { path: string }[] };

const SIGNALS: NoticeSignal[] = ["crisis_language", "daily_training", "double_sessions"];

describe("database (0065)", () => {
  it("lets guardian and young member read the same rows, and neither write them", () => {
    expect(MIGRATION).toMatch(/for select to authenticated\s+using \(guardian_member_id = auth\.uid\(\)\)/);
    expect(MIGRATION).toMatch(/for select to authenticated\s+using \(youth_member_id = auth\.uid\(\)\)/);
    expect(MIGRATION).not.toMatch(/on public\.guardian_notices for (insert|update|delete|all)/);
  });

  it("only knows the signs the rules can compute", () => {
    expect(MIGRATION).toContain("check (signal in ('crisis_language', 'daily_training', 'double_sessions'))");
  });

  it("keeps the live-apply guard in the header", () => {
    expect(MIGRATION).toContain("Do not apply to live until");
  });
});

describe("what the guardian is told", () => {
  it("has the same observational sentence for every sign in both languages", () => {
    for (const s of SIGNALS) {
      expect(daYouth.notices[s]).toContain("{name}");
      expect(enYouth.notices[s]).toContain("{name}");
    }
  });

  it("never passes journal text into a notice", () => {
    expect(JOURNAL_ACTION).toContain("notifyGuardiansOfCrisis(member.id)");
    expect(JOURNAL_ACTION).not.toMatch(/notifyGuardiansOfCrisis\([^)]*body/);
    expect(NOTICES).not.toMatch(/journal_entries|mind_check_logs/);
  });

  it("points to a calm talk, the family doctor and LMS, and names no diagnosis", () => {
    expect(daYouth.notices.concernNext).toContain("lms.dk");
    expect(daYouth.notices.concernNext).toContain("egen læge");
    expect(daYouth.notices.concernNext).toContain("ikke en diagnose");
    for (const s of SIGNALS) {
      expect(daYouth.notices[s]).not.toMatch(/spiseforstyrrelse|anoreksi|bulimi|depression|syg/i);
    }
  });

  it("sends the concern check from a daily cron", () => {
    expect(VERCEL.crons.map((c) => c.path)).toContain("/api/cron/youth-signals");
  });
});

describe("what the young member sees", () => {
  it("shows unseen notices first on I dag", () => {
    expect(TODAY).toContain("unseenNoticesForYouth(memberId)");
    expect(TODAY.indexOf("<YouthNotices")).toBeLessThan(TODAY.indexOf("sessionEyebrow"));
  });

  it("only lets the young member it concerns mark a notice seen", () => {
    expect(ACK).toContain("markNoticeSeen(member.id, id)");
    expect(NOTICES).toMatch(/\.eq\("id", noticeId\)\s*\.eq\("youth_member_id", youthMemberId\)/);
  });

  it("offers no coach contact to a minor in the crisis dialog or the action", () => {
    expect(MODAL).toMatch(/\{youth \? null : \(\s*<button[\s\S]*?tellMunk/);
    expect(ESCALATE_ACTION).toMatch(/isYouthAccount\(member\.id\)\) return \{ error: "not_available" \}/);
  });
});
