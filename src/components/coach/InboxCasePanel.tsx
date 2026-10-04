import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import AdaptiveAlertCard from "@/components/coach/AdaptiveAlertCard";
import { FormCheckReview } from "@/components/coach/CoachReview";
import HrvAlertCard from "@/components/coach/HrvAlertCard";
import { InboxReasonChip, formatInboxWhen } from "@/components/coach/PriorityInboxList";
import Avatar from "@/components/ui/Avatar";
import type { PriorityInboxItem } from "@/lib/coach/priority-inbox";
import {
  getOpenAdaptiveAlerts,
  getOpenHrvAlerts,
  getPendingFormChecks,
} from "@/lib/data/coach";

/**
 * Right-hand panel of the inbox split view (spec §6.8, lg+ only). Reuses
 * the queue's own cards — the panel is a second door to the same
 * actions, never a copy of them. Kinds without an inline card (Safety,
 * stale members) keep their full page and get a link to it.
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
          <h2 className="font-display text-2xl truncate">@{item.memberHandle}</h2>
          <div className="mt-1 flex items-center gap-3">
            <InboxReasonChip item={item} />
            <time dateTime={item.occurredAt} className="numeric text-xs text-fg-dim">
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
    if (alert) return <HrvAlertCard alert={alert} />;
  }
  if (item.kind === "adaptive") {
    const alert = (await getOpenAdaptiveAlerts(50)).find((a) => a.alertId === rawId);
    if (alert) return <AdaptiveAlertCard alert={alert} />;
  }

  const body =
    item.kind === "mental_safety"
      ? t("panelSafety")
      : item.kind === "stale_session"
        ? t("panelStale")
        : t("panelElsewhere");
  return (
    <p className="max-w-prose text-sm text-fg-body">{body}</p>
  );
}
