import { getTranslations } from "next-intl/server";

import Container from "@/components/Container";
import CounterfactualSliders from "@/components/adaptive/CounterfactualSliders";
import {
  EXPLAINER_EXPLANATION_DA,
  explainerScenarioDecision,
  explainerScenarioInput,
} from "@/lib/adaptive/mock-scenarios";
import {
  formatFeelingState,
  formatSleepHours,
  labelForAction,
} from "@/lib/adaptive/reason-narratives";

/**
 * WAUW-1 — public landing-page engine playground.
 *
 * Spec: .claude/plans/for-at-have-wauw-humble-naur.md §"Killer demo"
 *
 * Wraps the existing `CounterfactualSliders` (built for /hrv/learn/
 * adaptive) in a marketing-grade two-column shell that lives at
 * `#engine` on the public landing page. Visitor sees:
 *
 *   Left column  → the signals the engine is reading right now
 *                  (HRV bucket · sleep · alcohol · feeling), the
 *                  current verdict, and the Danish reason chain.
 *   Right column → live sliders. Drag them and the verdict + chain
 *                  recompute client-side in <16ms via the same pure
 *                  `evaluateAdaptation` function the app uses in
 *                  production. No API, no spinner, no fork.
 *
 * Integrity story: this component imports the EXACT same engine and
 * scenario primitives the in-app surface uses. `mock-scenarios.ts`
 * has tests asserting the baseline scenario actually fires
 * `top_set_reduction` — so the playground can't lie. If the rules
 * change, this page changes with them.
 *
 * Performance: the heavy work is `useDeferredValue` + a pure
 * function, already handled inside `CounterfactualSliders`. This
 * shell renders synchronously on the server (no async data, no
 * Supabase imports) so it stays out of the LCP path — Hero is still
 * the LCP element.
 *
 * Telemetry: `modifierId="landing"` distinguishes public-surface
 * usage from the in-app counterfactual events.
 */
export default async function AdaptivePlaygroundPublic() {
  const t = await getTranslations("Marketing.engine");
  const baseline = explainerScenarioInput();
  const baselineDecision = explainerScenarioDecision();

  return (
    <section
      id="engine"
      data-reveal
      className="relative py-20 lg:py-28 scroll-mt-20"
    >
      <Container className="space-y-8 lg:space-y-12">
        {/* ---------- Header ---------- */}
        <header className="max-w-3xl">
          <div className="eyebrow mb-3">{t("eyebrow")}</div>
          <h2 className="font-display text-[clamp(2.25rem,6vw,4rem)] leading-[0.95] mb-4">
            {t("heading")}
          </h2>
          <p className="text-fg-dim leading-relaxed text-base lg:text-lg max-w-2xl">
            {t("intro")}
          </p>
        </header>

        {/* ---------- Two-column engine view ---------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
          {/* Left: signals snapshot + verdict + reason chain */}
          <div className="space-y-5 order-2 lg:order-1">
            <SignalsSnapshot
              baseline={baseline}
              headingLabel={t("signalsHeading")}
              hrvLabel={t("signalLabels.hrv")}
              sleepLabel={t("signalLabels.sleep")}
              alcoholLabel={t("signalLabels.alcohol")}
              feelingLabel={t("signalLabels.feeling")}
            />

            <div className="surface rounded-lg p-5 lg:p-6 space-y-3">
              <div className="eyebrow text-fg-faint">
                {t("decisionHeading")}
              </div>
              <div className="numeric text-2xl lg:text-3xl text-fg">
                → {labelForAction(baselineDecision.action)}
              </div>
              <div className="space-y-1.5 pt-2 border-t hairline">
                <div className="eyebrow text-fg-faint">
                  {t("reasoningHeading")}
                </div>
                <p className="text-sm text-fg/90 leading-relaxed">
                  {EXPLAINER_EXPLANATION_DA}
                </p>
              </div>
            </div>
          </div>

          {/* Right: the live playground */}
          <div className="order-1 lg:order-2">
            <div className="surface-2 rounded-lg p-5 lg:p-6">
              <CounterfactualSliders
                baseline={baseline}
                baselineDecision={baselineDecision}
                modifierId="landing"
                alwaysOpen
              />
            </div>
          </div>
        </div>

        {/* ---------- Disclaimer + deep-link ---------- */}
        <footer className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-4 border-t hairline">
          <p className="text-xs font-mono text-fg-faint max-w-md">
            {t("disclaimer")}
          </p>
          <a
            href="/hrv/learn/adaptive"
            className="text-xs font-mono uppercase tracking-[0.14em] text-fg-dim hover:text-fg lift inline-flex items-center gap-1"
          >
            {t("ctaHowItWorks")}
          </a>
        </footer>
      </Container>
    </section>
  );
}

/* ================================================================== *
 * Internal layout primitives — kept inline because they're not used
 * anywhere else and hoisting to their own file would just create
 * read-overhead. Pure presentational; no hooks.
 * ================================================================== */

function SignalsSnapshot({
  baseline,
  headingLabel,
  hrvLabel,
  sleepLabel,
  alcoholLabel,
  feelingLabel,
}: {
  baseline: ReturnType<typeof explainerScenarioInput>;
  headingLabel: string;
  hrvLabel: string;
  sleepLabel: string;
  alcoholLabel: string;
  feelingLabel: string;
}) {
  const hrvText = baseline.latestReading?.readinessBucket ?? "—";
  const sleepText =
    baseline.lifestyle.sleepHoursAvg2d === null
      ? "—"
      : formatSleepHours(baseline.lifestyle.sleepHoursAvg2d);
  const alcoholText = baseline.lifestyle.alcoholLast2d ? "Ja" : "Nej";
  const feelingText = formatFeelingState(baseline.lifestyle.feelingLast3d);

  return (
    <div className="surface-2 rounded-lg p-5 lg:p-6 space-y-3">
      <div className="eyebrow text-fg-faint">{headingLabel}</div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <SignalRow label={hrvLabel} value={hrvText} />
        <SignalRow label={sleepLabel} value={sleepText} />
        <SignalRow label={alcoholLabel} value={alcoholText} />
        <SignalRow label={feelingLabel} value={feelingText} />
      </dl>
    </div>
  );
}

function SignalRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
        {label}
      </dt>
      <dd className="numeric text-sm text-fg/90 tabular-nums mt-0.5">
        {value}
      </dd>
    </div>
  );
}
