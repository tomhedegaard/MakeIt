import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import {
  getNeedsAttentionModel,
  getOpenAdaptiveAlerts,
  getOpenHrvAlerts,
  getPendingFormChecks,
} from "@/lib/data/coach";
import CoachReviewButton from "@/components/coach/CoachReview";
import HrvAlertCard from "@/components/coach/HrvAlertCard";
import AdaptiveAlertCard from "@/components/coach/AdaptiveAlertCard";
import NeedsAttentionStrip from "@/components/coach/NeedsAttentionStrip";
import { loadNeedsAttentionCopy } from "@/lib/ui/sprint-b-copy";
import { liftLabel } from "@/lib/form-queue/queue";

export default async function CoachQueuePage() {
  const t = await getTranslations("Coach.queue");
  const [adaptiveAlerts, hrvAlerts, pending, needs, needsCopy] = await Promise.all([
    getOpenAdaptiveAlerts(50),
    getOpenHrvAlerts(50),
    getPendingFormChecks(50),
    getNeedsAttentionModel(),
    loadNeedsAttentionCopy(),
  ]);

  return (
    <Container className="py-6 lg:py-12 space-y-6">
      <header className="pt-2 flex items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">{t("eyebrow")}</div>
          <h1 className="font-display text-[clamp(2rem,6vw,3rem)] leading-[0.95]">
            {t("title")}
          </h1>
          <p className="mt-2 text-fg-dim text-sm">
            {t("waiting", { formChecks: pending.length, hrvAlerts: hrvAlerts.length })}
          </p>
        </div>
      </header>

      <NeedsAttentionStrip model={needs} copy={needsCopy} />

      {/*
        Adaptive engine queue — escalations the engine couldn't act on
        without Munk's sign-off (paused_session, deload_week_insertion,
        escalate_to_coach, or any modifier the reasoning layer marked
        humanReviewRecommended=true). Hidden when empty rather than
        showing an empty-state — keeps the page quiet on a normal day.
      */}
      {adaptiveAlerts.length > 0 ? (
        <section className="space-y-3">
          <div>
            <div className="eyebrow mb-2">Adaptive engine</div>
            <h2 className="font-display text-2xl">
              {adaptiveAlerts.length === 1
                ? "1 forslag afventer dig"
                : `${adaptiveAlerts.length} forslag afventer dig`}
            </h2>
          </div>
          <ul className="space-y-3">
            {adaptiveAlerts.map((a) => (
              <li key={a.alertId} id={`engine-${a.alertId}`}>
                <AdaptiveAlertCard alert={a} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <div>
          <div className="eyebrow mb-2">{t("hrvSectionEyebrow")}</div>
          <h2 className="font-display text-2xl">
            {t("hrvSectionHeading", { count: hrvAlerts.length })}
          </h2>
        </div>

        {hrvAlerts.length === 0 ? (
          <p className="text-fg-faint text-sm">
            {t("hrvSectionEmpty")}
          </p>
        ) : (
          <ul className="space-y-3">
            {hrvAlerts.map((a) => (
              <li key={a.id}>
                <HrvAlertCard alert={a} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div>
        <div className="eyebrow mb-2">{t("formChecksSectionEyebrow")}</div>
        <h2 className="font-display text-2xl">
          {t("formChecksSectionHeading", { count: pending.length })}
        </h2>
      </div>

      {pending.length === 0 ? (
        <div className="surface-2 rounded-2xl p-8 text-center">
          <div className="font-display text-2xl mb-2">{t("emptyTitle")}</div>
          <p className="text-fg-dim text-sm">
            {t("emptyBody")}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {pending.map((f) => (
            <li key={f.id} id={`form-${f.id}`} className="surface-2 rounded-2xl p-5">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="min-w-0">
                  <div className="text-sm">
                    <Link
                      href={`/coach/members/${f.memberId}`}
                      className="hover:underline"
                    >
                      @{f.memberHandle}
                    </Link>
                  </div>
                  <div className="text-[11px] font-mono text-fg-faint">
                    {liftLabel(f)} ·{" "}
                    {new Date(f.createdAt).toLocaleString("da-DK", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="numeric text-2xl">{f.aiScore ?? "—"}</div>
                  <div className="eyebrow">/ 100</div>
                </div>
              </div>

              {f.aiHeadline ? (
                <p className="text-fg/90 text-sm leading-relaxed mb-3">
                  {f.aiHeadline}
                </p>
              ) : null}

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
                  {t("awaitingReview")}
                </span>
                <CoachReviewButton formCheck={f} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
