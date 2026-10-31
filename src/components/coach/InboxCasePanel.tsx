import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import AdaptiveAlertCard from "@/components/coach/AdaptiveAlertCard";
import { FormCheckReview } from "@/components/coach/CoachReview";
import HrvAlertCard from "@/components/coach/HrvAlertCard";
import FoodSignalSeenButton from "@/components/coach/FoodSignalSeenButton";
import { InboxReasonChip, formatInboxWhen } from "@/components/coach/PriorityInboxList";
import Avatar from "@/components/ui/Avatar";
import type { PriorityInboxItem } from "@/lib/coach/priority-inbox";
import {
  getOpenAdaptiveAlerts,
  getOpenHrvAlerts,
  getPendingFormChecks,
} from "@/lib/data/coach";
import { getHrvReadingSeries } from "@/lib/data/hrv";
import { getMentalSafetyMetrics } from "@/lib/data/mind";
import { buildHrvBandView, PERSONAL_WINDOW_MAX } from "@/lib/hrv/band";
import { buildDemoHrvSeries } from "@/lib/hrv/demo-series";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";

/**
 * Right-hand panel of the inbox split view (spec §6.8, lg+ only). Reuses
 * the queue's own cards, so the panel is a second door to the same
 * actions, never a copy of them. Every kind renders an inline minimum
 * (Safety: the member's own summary; stale: days since the last session)
 * and links to its full page.
 */
export default async function InboxCasePanel({
  item,
  coachName,
}: {
  item: PriorityInboxItem;
  coachName: string;
}) {
  const t = await getTranslations("Coach.inbox");
  const locale = await getLocale();
  const rawId = item.id.slice(item.kind.length + 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar handle={item.memberHandle} className="size-11" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-section truncate">@{item.memberHandle}</h2>
          <div className="mt-1 flex items-center gap-3">
            <InboxReasonChip item={item} />
            <time dateTime={item.occurredAt} className="numeric text-micro text-fg-dim">
              {formatInboxWhen(item.occurredAt, locale)}
            </time>
          </div>
        </div>
        <Link href={item.href} className="btn btn-sm btn-ghost shrink-0">
          {t("openFull")}
        </Link>
      </div>

      <div className="border-t hairline pt-6">
        <CaseBody item={item} rawId={rawId} coachName={coachName} />
      </div>
    </div>
  );
}

async function CaseBody({
  item,
  rawId,
  coachName,
}: {
  item: PriorityInboxItem;
  rawId: string;
  coachName: string;
}) {
  const t = await getTranslations("Coach.inbox");

  if (item.kind === "form_check") {
    const fc = (await getPendingFormChecks(50)).find((f) => f.id === rawId);
    if (fc) {
      return (
        <FormCheckReview
          key={fc.id}
          formCheck={fc}
          submitLabel={t("sendAs", { name: coachName })}
        />
      );
    }
  }
  if (item.kind === "hrv_alert") {
    const alert = (await getOpenHrvAlerts(50)).find((a) => a.id === rawId);
    if (alert) {
      return (
        <div className="space-y-6">
          <HrvReadingVsBand memberId={item.memberId} />
          <HrvAlertCard alert={alert} showHeader={false} />
        </div>
      );
    }
  }
  if (item.kind === "adaptive") {
    const alert = (await getOpenAdaptiveAlerts(50)).find((a) => a.alertId === rawId);
    if (alert) return <AdaptiveAlertCard alert={alert} />;
  }
  if (item.kind === "mental_safety") {
    const safety = await getMentalSafetyMetrics(7);
    const alert = safety.openAlerts.find((a) => a.id === rawId);
    return (
      <div className="max-w-prose space-y-3">
        {alert ? (
          <p className="text-fg leading-relaxed whitespace-pre-wrap">{alert.summary}</p>
        ) : null}
        <p className="text-meta text-fg-dim">{t("panelSafety")}</p>
      </div>
    );
  }
  if (item.kind === "food_relationship") {
    const signals = String(item.reasonParams?.signals ?? "").split(",").filter(Boolean);
    return (
      <div className="max-w-prose space-y-4">
        <ul className="space-y-1 text-fg">
          {signals.map((s) => (
            <li key={s}>{t(`foodSignals.${s}`)}</li>
          ))}
        </ul>
        <p className="text-meta text-fg-dim">{t("panelFood")}</p>
        <FoodSignalSeenButton memberId={item.memberId} />
      </div>
    );
  }
  if (item.kind === "stale_session") {
    const days = item.reasonParams?.days;
    return (
      <div className="max-w-prose space-y-3">
        <p className="text-fg">
          {typeof days === "number"
            ? t("panelStaleDays", { days })
            : t("panelStaleNever")}
        </p>
        <p className="text-meta text-fg-dim">{t("panelStale")}</p>
      </div>
    );
  }

  // The case closed between the list and the panel render.
  return <p className="max-w-prose text-copy text-fg-body">{t("panelMissing")}</p>;
}

/**
 * The member's latest night against their personal band, so the coach
 * reads the HRV case without leaving the inbox. Demo mode has no HRV
 * tables, so it reads the same deterministic series the member app shows.
 */
async function HrvReadingVsBand({ memberId }: { memberId: string }) {
  const t = await getTranslations("Coach.inbox");
  const readings = SUPABASE_ENABLED
    ? await getHrvReadingSeries(memberId, { rangeDays: PERSONAL_WINDOW_MAX })
    : buildDemoHrvSeries();
  const view = buildHrvBandView(readings);

  if (view.latestMs == null) {
    return <p className="text-meta text-fg-dim">{t("panelHrvNone")}</p>;
  }
  return (
    <dl className="grid grid-cols-2 gap-6 max-w-sm">
      <div>
        <dt className="text-micro text-fg-dim">{t("panelHrvLatest")}</dt>
        <dd className="numeric text-section mt-1">{view.latestMs} ms</dd>
      </div>
      <div>
        <dt className="text-micro text-fg-dim">{t("panelHrvBand")}</dt>
        <dd className="numeric text-section mt-1">
          {view.bandLowMs != null && view.bandHighMs != null
            ? `${view.bandLowMs}–${view.bandHighMs} ms`
            : t("panelHrvBuilding", { count: view.nightsCollected })}
        </dd>
      </div>
    </dl>
  );
}
