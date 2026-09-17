import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PageTitle from "@/components/ui/PageTitle";
import SandboxCaseCard from "@/components/coach-school/SandboxCaseCard";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import {
  getPendingSandboxCases,
  getSandboxTier,
} from "@/lib/data/coach-school";

/**
 * CC-4 — Coach School sandbox surface.
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §7
 *
 * Gated by coach_tier ∈ {beast_sandbox, beast_live, munk}. Munk's
 * application/approval flow ships in CC-7 — until then coach_tier is
 * set manually for testing (Supabase dashboard / SQL).
 *
 * Lists pending sandbox cases: decided hrv_alerts the Beast hasn't
 * yet reviewed. Each card hides Munk's decision until submit, then
 * reveals the comparison + agreement score. The running mean over the
 * last 50 cases drives the promotion gate (computed in CC-8).
 */
export default async function CoachSchoolSandboxPage() {
  const t = await getTranslations("CoachSchool");
  const tier = await getSandboxTier();
  if (!tier) {
    // Non-sandbox member: hide the surface honestly. Member-facing
    // /coach-school/apply ships in CC-7 — for now we send them home.
    redirect("/dashboard");
  }

  const cases = await getPendingSandboxCases();

  return (
    <Container className="py-6 lg:py-12 space-y-6">
      <div className="pt-2">
        <PageTitle size="compact" kicker={t("eyebrow")} title={t("title")} />
        <p className="mt-2 text-fg-dim text-sm">
          {t("subtitle", { count: cases.length })}
        </p>
      </div>

      {cases.length === 0 ? (
        <div className="surface-2 rounded-lg p-6 text-center">
          <p className="text-fg-dim text-sm">{t("empty")}</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {cases.map((c) => (
            <li key={c.alertId}>
              <SandboxCaseCard sandboxCase={c} isDemo={!SUPABASE_ENABLED} />
            </li>
          ))}
        </ul>
      )}

      <footer className="pt-4 border-t hairline">
        <p className="text-xs font-mono text-fg-faint">
          {t("footnote")}
        </p>
      </footer>
    </Container>
  );
}
