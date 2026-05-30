import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import LiveDecisionCard from "@/components/coach-school/LiveDecisionCard";
import {
  getOpenLiveCases,
  getSandboxTier,
} from "@/lib/data/coach-school";

/**
 * CC-5 — live decision surface for a promoted co-coach.
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §7
 *
 * Gated to coach_tier ∈ {beast_live, munk} — sandbox coaches stay on
 * /coach-school/sandbox until promoted. Lists open hrv_alerts for the
 * co-coach's currently-assigned members; each decision closes the
 * alert and posts a coach_reviews row with mode='live'.
 *
 * Munk passes the gate for testing (so the surface is exercisable in
 * demo mode and during inspection); his "assigned members" list is
 * empty by default — the demo-mode mocks ship two visual cases so
 * the page is non-empty during verification.
 */
export default async function CoachSchoolLivePage() {
  const t = await getTranslations("CoachSchool");
  const tier = await getSandboxTier();
  if (tier !== "beast_live" && tier !== "munk") {
    redirect("/coach-school/sandbox");
  }

  const cases = await getOpenLiveCases();

  return (
    <Container className="py-6 lg:py-12 space-y-6">
      <header className="pt-2">
        <div className="eyebrow mb-2">{t("live.eyebrow")}</div>
        <h1 className="font-display text-[clamp(2rem,6vw,3rem)] leading-[0.95]">
          {t("live.title")}
        </h1>
        <p className="mt-2 text-fg-dim text-sm">
          {t("live.subtitle", { count: cases.length })}
        </p>
      </header>

      {cases.length === 0 ? (
        <div className="surface-2 rounded-lg p-6 text-center">
          <p className="text-fg-dim text-sm">{t("live.empty")}</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {cases.map((c) => (
            <li key={c.alertId}>
              <LiveDecisionCard liveCase={c} />
            </li>
          ))}
        </ul>
      )}

      <footer className="pt-4 border-t hairline">
        <p className="text-xs font-mono text-fg-faint">{t("live.footnote")}</p>
      </footer>
    </Container>
  );
}
