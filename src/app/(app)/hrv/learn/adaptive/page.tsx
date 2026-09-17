import Link from "next/link";
import { getTranslations } from "next-intl/server";

import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import HrvSubNav from "@/components/hrv/HrvSubNav";

import CounterfactualSliders from "@/components/adaptive/CounterfactualSliders";
import ReasoningDetailPanel from "@/components/adaptive/ReasoningDetailPanel";
import {
  EXPLAINER_EXPLANATION_DA,
  EXPLAINER_REASONING_OUTPUT,
  explainerScenarioDecision,
  explainerScenarioInput,
} from "@/lib/adaptive/mock-scenarios";
import { labelForAction } from "@/lib/adaptive/reason-narratives";

/**
 * `/hrv/learn/adaptive` — marketing-grade explainer for the adaptive
 * engine. Pure static page, no member resolution. Members reach it
 * from the "Hvordan motoren tænker" link on AdaptiveConsentCard so
 * they can see what they're opting into before flipping the flag.
 *
 * Spec: docs/superpowers/specs/2026-05-26-open-brain-ui-v0-design.md §3 (T5)
 *
 * Layout — five blocks:
 *   1. Hero copy (what + why)
 *   2. Demo AdaptationCard with the explainer scenario
 *   3. Expanded ReasoningDetailPanel (always-open here — no <details>
 *      wrapping since the whole point is to show what's inside)
 *   4. Live CounterfactualSliders the visitor can play with
 *   5. Boundaries — what the engine may do alone vs what Munk approves
 *   6. Back link to /hrv where they can opt in
 *
 * The interactive parts (counterfactual sliders) work against the
 * scenario's baseline. There's no DB and no member context — every
 * visitor sees the same demo data.
 */
export default async function AdaptiveLearnPage() {
  const t = await getTranslations("Hrv.learnAdaptive");
  const baseline = explainerScenarioInput();
  const baselineDecision = explainerScenarioDecision();

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <Container className="py-8 lg:py-12 space-y-8">
        <HrvSubNav />

        {/* ---------- 1. Hero ---------- */}
        <section className="space-y-3 max-w-2xl">
          <p className="text-fg-dim leading-relaxed">{t("hero.p1")}</p>
          <p className="text-fg-dim leading-relaxed">{t("hero.p2")}</p>
        </section>

        {/* ---------- 2. Demo AdaptationCard ---------- */}
        <section className="space-y-3">
          <div className="eyebrow">{t("example.eyebrow")}</div>
          <article className="surface-2 rounded-2xl p-5 lg:p-6 space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="eyebrow">{t("example.title")}</h2>
              <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-dim">
                {t("example.meta")}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-fg-dim">
              {EXPLAINER_EXPLANATION_DA}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled
                className="flex-1 rounded-lg border hairline bg-bg-2 px-3 py-2 text-[12px] font-mono uppercase tracking-[0.12em] opacity-60 cursor-not-allowed"
              >
                {t("example.accept")}
              </button>
              <button
                type="button"
                disabled
                className="flex-1 rounded-lg border hairline px-3 py-2 text-[12px] font-mono uppercase tracking-[0.12em] text-fg-dim opacity-60 cursor-not-allowed"
              >
                {t("example.keep")}
              </button>
            </div>
          </article>
          <p className="text-[11px] text-fg-faint">
            {t("example.note")}
          </p>
        </section>

        {/* ---------- 3. Expanded reasoning ---------- */}
        <section className="space-y-3">
          <div className="eyebrow">{t("reasoningEyebrow")}</div>
          <div className="surface-2 rounded-2xl p-5 lg:p-6">
            <ReasoningDetailPanel
              signals={baseline}
              ruleDecision={{
                action: baselineDecision.action,
                reasons: baselineDecision.reasons,
                confidence: baselineDecision.confidence,
                params: baselineDecision.params,
              }}
              reasoningOutput={EXPLAINER_REASONING_OUTPUT}
              recentFormCheckCount={baseline.recentFormChecks.length}
            />
          </div>
        </section>

        {/* ---------- 4. Counterfactual playground ---------- */}
        <section className="space-y-3">
          <div className="eyebrow">{t("playground.eyebrow")}</div>
          <div className="surface-2 rounded-2xl p-5 lg:p-6 space-y-3">
            <p className="text-sm text-fg-dim leading-relaxed">
              {t("playground.body")}
            </p>
            <CounterfactualSliders
              baseline={baseline}
              baselineDecision={baselineDecision}
              modifierId="explainer"
            />
          </div>
        </section>

        {/* ---------- 5. Boundaries ---------- */}
        <section className="space-y-4 max-w-2xl">
          <h2 className="font-display text-2xl">{t("bounds.title")}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="surface-2 rounded-2xl p-5 space-y-2">
              <h3 className="eyebrow">{t("bounds.engineTitle")}</h3>
              <ul className="text-sm text-fg-dim leading-relaxed space-y-1 list-disc list-inside marker:text-fg-faint">
                {(t.raw("bounds.engine") as string[]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="surface-2 rounded-2xl p-5 space-y-2">
              <h3 className="eyebrow">{t("bounds.coachTitle")}</h3>
              <ul className="text-sm text-fg-dim leading-relaxed space-y-1 list-disc list-inside marker:text-fg-faint">
                {(t.raw("bounds.coach") as string[]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-sm text-fg-dim leading-relaxed">
            {t("bounds.footer")}
          </p>
        </section>

        {/* ---------- 6. Back to /hrv ---------- */}
        <section className="pt-4">
          <Link
            href="/hrv"
            className="inline-block text-[12px] font-mono uppercase tracking-[0.14em] text-fg-dim hover:text-fg lift touch-app"
          >
            {t.rich("backLink", {
              faint: (chunks) => <span className="text-fg-faint">{chunks}</span>,
            })}
          </Link>
        </section>

        <p className="text-[10px] text-fg-faint">
          {t("exampleDecision", {
            action: labelForAction(baselineDecision.action),
            confidence: baselineDecision.confidence.toFixed(2),
          })}
        </p>
      </Container>
    </>
  );
}
