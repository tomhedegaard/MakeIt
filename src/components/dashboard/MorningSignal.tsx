import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { intlLocaleTag } from "@/i18n/config";
import { formatNumber } from "@/lib/utils";
import Sparkline from "@/components/ui/Sparkline";
import OffPlanLogButton from "@/app/(app)/nutrition/OffPlanLogButton";

import {
  buildMorningSignal,
  type MorningSignalCard,
  type MorningSignalInk,
  type MorningSignalInput,
} from "@/lib/dashboard/morning-signal";

/**
 * I dag som kort (spec 2026-09-27 B.1): kicker, one number, one why-line,
 * data ink, and the card links to its pillar. Domain colour only on the
 * kicker and the ink; numbers stay in ink, never status colours.
 */
export default function MorningSignal({
  input,
  estimateEnabled = false,
}: {
  input: MorningSignalInput;
  estimateEnabled?: boolean;
}) {
  const t = useTranslations("Dashboard.morningSignal");
  const cards = buildMorningSignal(input);
  const tag = intlLocaleTag(useLocale());
  const fmt = (n: number) => formatNumber(n, tag);

  function headline(card: MorningSignalCard): string {
    return card.value !== undefined ? fmt(card.value) : t(`values.${card.valueKey}`);
  }

  function unitLine(card: MorningSignalCard): string {
    if (card.value === undefined || !card.unit) return "";
    const unit = t(`unit.${card.unit}`, { of: fmt(card.of ?? 0) });
    return card.valueKey ? `${unit} · ${t(`values.${card.valueKey}`)}` : unit;
  }

  function why(card: MorningSignalCard): string {
    return card.why
      .map((w) => t(`why.${w.key}`, Object.fromEntries(Object.entries(w.values ?? {}).map(([k, v]) => [k, fmt(v)]))))
      .join(" · ");
  }

  return (
    <section aria-label={t("label")}>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2">
        {cards.map((card) => (
          <li
            key={card.domain}
            data-domain={card.domain}
            className="min-w-0 flex flex-col border hairline bg-bg-2 max-sm:odd:last:col-span-2"
          >
            <Link href={card.href} className="relative flex min-w-0 flex-1 flex-col gap-1 p-4 sm:p-5 lift touch-app">
              <span className="sr-only">
                {t("sr.card", { label: t(`labels.${card.domain}`), main: `${headline(card)} ${unitLine(card)}`.trim(), why: why(card) })}
              </span>
              <span aria-hidden className="flex min-w-0 flex-col gap-1">
                <span className="eyebrow eyebrow-domain">{t(`labels.${card.domain}`)}</span>
                <span className={card.value !== undefined ? "numeric text-title text-fg" : "text-section text-fg"}>
                  {headline(card)}
                </span>
                {card.value !== undefined ? (
                  <span className="text-meta text-fg-dim break-words">{unitLine(card)}</span>
                ) : null}
                <span className="text-micro text-fg-dim break-words">{why(card)}</span>
                {card.ink ? <Ink ink={card.ink} /> : null}
              </span>
            </Link>
            {card.domain === "food" ? (
              <div className="px-2 pb-3 sm:px-3 -mt-2">
                <OffPlanLogButton estimateEnabled={estimateEnabled} variant="card" />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Ink({ ink }: { ink: MorningSignalInk }) {
  if (ink.kind === "spark") {
    return <Sparkline data={ink.data} height={32} showLastPoint={false} className="mt-2 h-8 text-domain" />;
  }
  if (ink.kind === "bar") {
    return (
      <span className="mt-3 block h-1 bg-line" data-ink="bar">
        <span className="block h-full bg-domain" style={{ width: `${Math.round(ink.ratio * 100)}%` }} />
      </span>
    );
  }
  return (
    <span className="mt-3 flex h-4 items-end gap-1" data-ink="ticks">
      {ink.values.map((v, i) => (
        <span key={i} className="block w-1 bg-domain" style={{ height: `${Math.round((v / 5) * 100)}%` }} />
      ))}
    </span>
  );
}
