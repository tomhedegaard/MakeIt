import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actionsSrc = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");
const pageSrc = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const clientSrc = readFileSync(
  new URL("./OnboardingClient.tsx", import.meta.url),
  "utf8",
);

describe("onboarding DONE action wiring", () => {
  it("materializes week 1 via the service-role Start Program helper", () => {
    expect(actionsSrc).toContain("assignProgramForAuthenticatedMember");
    expect(actionsSrc).toContain("catalogProgramForProfile");
    expect(actionsSrc).toContain("canMemberAssignProgram");
    expect(actionsSrc).toContain("memberId: user.id");
    expect(actionsSrc).toContain("programId: prog.id");
    expect(actionsSrc).not.toContain("assignProgramFromBlueprint(");
    expect(actionsSrc).not.toContain("generateProgram(");
    expect(actionsSrc).not.toMatch(/for\s*\(\s*const\s+s\s+of\s+generated\.sessions/);
    expect(actionsSrc).not.toContain('.from("session_exercises")');
    expect(actionsSrc).not.toContain('.from("session_sets")');
  });

  it("skips materialize when sessions already exist, then stamps onboarded_at", () => {
    const assignCall = actionsSrc.indexOf("assignProgramForAuthenticatedMember({");
    const skipBranch = actionsSrc.indexOf("step=sessions-already-exist");
    const stampIdx = actionsSrc.indexOf("onboarded_at: new Date().toISOString()");
    expect(actionsSrc).toContain("if ((existingSessions ?? 0) === 0)");
    expect(assignCall).toBeGreaterThan(-1);
    expect(skipBranch).toBeGreaterThan(assignCall);
    expect(stampIdx).toBeGreaterThan(assignCall);
  });

  it("keeps demo-mode dashboard redirect and connected success redirect", () => {
    expect(actionsSrc).toContain("if (!SUPABASE_ENABLED)");
    expect(actionsSrc).toContain('step=demo-mode-skip-persist');
    expect(actionsSrc).toContain('redirect("/dashboard")');
    expect(actionsSrc).toContain("step=success-redirect-dashboard");
  });

  it("lets demo replay /onboarding even when the mock member is onboarded", () => {
    expect(pageSrc).toContain("SUPABASE_ENABLED");
    expect(pageSrc).toContain("if (SUPABASE_ENABLED && m.onboardedAt)");
    expect(pageSrc).not.toMatch(/if\s*\(\s*m\.onboardedAt\s*\)\s*redirect/);
  });
});

describe("onboarding DONE pending UI wiring", () => {
  it("uses explicit client pending, overlay, and hard dashboard navigation", () => {
    expect(clientSrc).toContain("useState(false)");
    expect(clientSrc).toContain("setPending(true)");
    expect(clientSrc).toContain("onSubmit={handleSubmit}");
    expect(clientSrc).toContain("event.preventDefault()");
    expect(clientSrc).toContain("step !== totalSteps");
    expect(clientSrc).toContain("PlanGenerationOverlay");
    expect(clientSrc).toContain("pending={pending}");
    expect(clientSrc).toContain('namespace="Onboarding.programOverlay"');
    expect(clientSrc).toContain("t(\"nav.submitting\")");
    expect(clientSrc).toContain("disabled={pending}");
    expect(clientSrc).toContain('window.location.assign("/dashboard")');
    expect(clientSrc).toContain("nextRedirectPath");
    expect(clientSrc).toContain("isNextRedirectError");
    expect(clientSrc).not.toMatch(/useFormStatus\s*\(/);
    expect(clientSrc).not.toMatch(/useTransition\s*\(/);
    expect(clientSrc).not.toContain("window.confirm");
    expect(clientSrc).not.toMatch(/if\s*\(\s*!confirm\(/);
  });
});
