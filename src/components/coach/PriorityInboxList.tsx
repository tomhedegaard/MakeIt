import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import type { PriorityInboxItem, PriorityInboxKind } from "@/lib/coach/priority-inbox";
import { cn } from "@/lib/utils";

const CHIP_TONE: Record<PriorityInboxKind, string> = {
  mental_safety: "border-danger/40 bg-danger/15 text-danger",
  hrv_alert: "border-warn/40 bg-warn/15 text-warn",
  adaptive: "border-warn/40 bg-warn/15 text-warn",
  form_check: "border hairline-strong text-fg-dim",
  stale_session: "border-warn/40 bg-warn/15 text-warn",
};

function formatWhen(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || iso.startsWith("1970-")) return "—";
  return d.toLocaleString(locale === "en" ? "en-GB" : "da-DK", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });
}

export default async function PriorityInboxList({
  items,
  safetyReadable,
  mode,
}: {
  items: PriorityInboxItem[];
  safetyReadable: boolean;
  mode: "demo" | "live";
}) {
  const t = await getTranslations("Coach.inbox");
  const locale = await getLocale();

  return (
    <div>
      {!safetyReadable ? (
        <p className="px-5 py-3 text-sm text-fg-dim border-b hairline">
          {t("safetyUnreadable")}
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="p-6 text-center space-y-2">
          <div className="font-display text-2xl">{t("emptyTitle")}</div>
          <p className="text-sm text-fg-dim max-w-md mx-auto">{t("emptyBody")}</p>
          {mode === "demo" ? (
            <p className="text-[11px] font-mono text-fg-faint">{t("emptyDemoHint")}</p>
          ) : null}
        </div>
      ) : (
        <ul className="divide-y hairline">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="px-5 py-3 flex items-center gap-4 hover:bg-bg-3/40 transition-colors"
                aria-label={t("openItem", { handle: item.memberHandle })}
              >
                <div className="size-9 rounded-full bg-bg-elev border hairline-strong flex items-center justify-center text-[10px] font-mono shrink-0">
                  {item.memberHandle.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">@{item.memberHandle}</div>
                  <div className="mt-1">
                    <span
                      className={cn(
                        "inline-flex text-[10px] font-mono uppercase tracking-[0.14em] rounded-full px-2 py-0.5 border",
                        CHIP_TONE[item.kind],
                      )}
                    >
                      {t(item.reasonKey, item.reasonParams)}
                    </span>
                  </div>
                </div>
                <time
                  dateTime={item.occurredAt}
                  className="numeric text-xs text-fg-dim shrink-0"
                >
                  {formatWhen(item.occurredAt, locale)}
                </time>
                <span className="text-fg-dim" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
