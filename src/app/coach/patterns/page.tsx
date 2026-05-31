import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PatternRow from "@/components/coach/PatternRow";
import {
  PATTERN_WINDOWS_DAYS,
  getCoachPatternsForPage,
  parseWindowDays,
} from "@/lib/data/coach-patterns";

/**
 * MM-8 — on-demand cohort patterns surface.
 *
 * Spec: docs/superpowers/specs/2026-05-26-munk-multiplier-v0-design.md §3 (MM-3 on-demand)
 *
 * Runs the four MM-3 detectors live with a coach-configurable window
 * (7 / 30 days). Each pattern row is a client-side `PatternRow` that
 * fires `coach_pattern_drilled_in` telemetry on click and expands to
 * show the affected members.
 *
 * Auth: the /coach/layout.tsx gate already requires `isCoach`. The
 * data fetcher uses the service-role client because the detectors
 * aggregate across all members (no per-coach RLS partition exists).
 */
export default async function CoachPatternsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const sp = await searchParams;
  const windowDays = parseWindowDays(sp.days);
  const t = await getTranslations("Coach.patterns");
  const { patterns, cohortSize } = await getCoachPatternsForPage(windowDays);

  return (
    <Container className="py-6 lg:py-12 space-y-6">
      <header className="pt-2">
        <div className="eyebrow mb-2">{t("eyebrow")}</div>
        <h1 className="font-display text-[clamp(2rem,6vw,3rem)] leading-[0.95]">
          {t("title")}
        </h1>
        <p className="mt-2 text-fg-dim text-sm">
          {t("subtitle", { cohortSize, windowDays })}
        </p>
      </header>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="eyebrow mr-2">{t("timeframeLabel")}</span>
        {PATTERN_WINDOWS_DAYS.map((d) => {
          const active = d === windowDays;
          return (
            <Link
              key={d}
              href={`/coach/patterns?days=${d}`}
              className={`btn btn-sm ${active ? "btn-primary" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {t("daysOption", { days: d })}
            </Link>
          );
        })}
      </div>

      {patterns.length === 0 ? (
        <div className="surface-2 rounded-lg p-6 text-center">
          <p className="text-fg-dim text-sm">{t("empty")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {patterns.map((p, i) => (
            <li key={`${p.code}-${i}`}>
              <PatternRow pattern={p} />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
