import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import Avatar from "@/components/ui/Avatar";
import type { PriorityInboxItem } from "@/lib/coach/priority-inbox";
import { cn } from "@/lib/utils";

/**
 * Reason chips. The coach console is monochrome (docs/DOMAIN_COLOR_SYSTEM.md
 * §8.1): every reason is a neutral 1px outline. Status red is kept only for
 * real safety cases — that is an alert, not a domain.
 */
export async function InboxReasonChip({ item }: { item: PriorityInboxItem }) {
  const t = await getTranslations("Coach.inbox");
  return (
    <span
      className={cn(
        "inline-flex border px-2 py-0.5 text-micro",
        item.kind === "mental_safety"
          ? "border-danger/40 bg-danger/15 text-danger"
          : "hairline-strong text-fg-dim",
      )}
    >
      {t(item.reasonKey, item.reasonParams)}
    </span>
  );
}

export function formatInboxWhen(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || iso.startsWith("1970-")) return "-";
  return d.toLocaleString(locale === "en" ? "en-GB" : "da-DK", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });
}

/** Split-view link for a case: stays on the inbox, swaps the panel. */
export function inboxCaseHref(id: string): string {
  return `/coach/inbox?case=${encodeURIComponent(id)}`;
}

const ROW =
  "relative px-5 py-3 items-center gap-4 transition-colors duration-200 ease-out hover:bg-bg-3 focus-visible:-outline-offset-2";

export default async function PriorityInboxList({
  items,
  safetyReadable,
  mode,
  selectedId,
}: {
  items: PriorityInboxItem[];
  safetyReadable: boolean;
  mode: "demo" | "live";
  /** The case open in the lg+ detail panel. */
  selectedId?: string | null;
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
        <div className="p-6 space-y-2">
          <div className="font-display text-2xl">{t("emptyTitle")}</div>
          <p className="text-sm text-fg-dim max-w-md">{t("emptyBody")}</p>
          {mode === "demo" ? (
            <p className="text-micro text-fg-faint">{t("emptyDemoHint")}</p>
          ) : null}
        </div>
      ) : (
        <ul className="divide-y hairline">
          {items.map((item) => {
            const selected = item.id === selectedId;
            // Phone/tablet rows open the case (arrow); lg+ rows only select
            // it — the panel's own link opens the full case.
            const content = (arrow: boolean) => (
              <>
                <Avatar handle={item.memberHandle} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm truncate">@{item.memberHandle}</span>
                  <span className="mt-1 block">
                    <InboxReasonChip item={item} />
                  </span>
                </span>
                <time
                  dateTime={item.occurredAt}
                  className="numeric text-xs text-fg-dim shrink-0"
                >
                  {formatInboxWhen(item.occurredAt, locale)}
                </time>
                {arrow ? (
                  <span className="text-fg-dim" aria-hidden="true">
                    →
                  </span>
                ) : null}
              </>
            );
            return (
              <li key={item.id}>
                {/* Phone and tablet: the row opens the case's own page. */}
                <Link href={item.href} className={cn(ROW, "flex lg:hidden")}>
                  {content(true)}
                </Link>
                {/* lg+: the row selects the case into the detail panel. */}
                <Link
                  href={inboxCaseHref(item.id)}
                  scroll={false}
                  aria-current={selected ? "page" : undefined}
                  className={cn(
                    ROW,
                    "hidden lg:flex",
                    selected &&
                      "bg-bg-3 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-signal",
                  )}
                >
                  {content(false)}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
