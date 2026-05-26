import {
  describeAdaptationOutcome,
  formatHistoryDate,
  formatHistoryRpeDelta,
  formatNextDayReadiness,
} from "@/lib/adaptive/history-narratives";
import { labelForAction } from "@/lib/adaptive/reason-narratives";
import type { AdaptationHistoryItem } from "@/lib/data/adaptive";

type Props = {
  items: AdaptationHistoryItem[];
  /** How many rows to show before the "Vis flere" disclosure. */
  initialVisible?: number;
};

/**
 * "Tidligere tilpasninger" section for /hrv (Søjle 2 OB-6).
 *
 * Renders the member's last N days of adaptive_v0 modifiers with
 * accept-state badges and outcome micro-context (RPE delta + next-day
 * HRV). First `initialVisible` rows always show; the rest live inside
 * a native <details> so the section stays compact by default.
 *
 * Server component — pure presentation, no interactivity beyond the
 * native disclosure. Empty state renders explanation copy so members
 * know what they're looking at when they first opt in.
 */
export default function AdaptationHistory({
  items,
  initialVisible = 5,
}: Props) {
  if (items.length === 0) {
    return (
      <section
        aria-labelledby="adaptation-history-heading"
        className="surface-2 rounded-2xl p-5 lg:p-6 space-y-2"
      >
        <h2 id="adaptation-history-heading" className="eyebrow">
          Tidligere tilpasninger
        </h2>
        <p className="text-sm text-fg-dim leading-relaxed">
          Motoren starter når dit HRV-baseline er klart og du har slået
          adaptiv tilpasning til. Når den begynder at justere dine
          sessioner, ser du dem her — så du kan se hvad der virkede.
        </p>
      </section>
    );
  }

  const visible = items.slice(0, initialVisible);
  const hidden = items.slice(initialVisible);

  return (
    <section
      aria-labelledby="adaptation-history-heading"
      className="surface-2 rounded-2xl p-5 lg:p-6 space-y-3"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="adaptation-history-heading" className="eyebrow">
          Tidligere tilpasninger
        </h2>
        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
          sidste 30 dage · {items.length}
        </span>
      </div>

      <ul className="divide-y hairline">
        {visible.map((item) => (
          <AdaptationHistoryRow key={item.modifierId} item={item} />
        ))}
      </ul>

      {hidden.length > 0 ? (
        <details className="group/hist">
          <summary className="cursor-pointer list-none text-[11px] font-mono uppercase tracking-[0.14em] text-fg-dim hover:text-fg select-none inline-flex items-center gap-1 lift touch-app">
            <span>Vis flere ({hidden.length})</span>
            <span
              aria-hidden
              className="group-open/hist:rotate-180 transition-transform"
            >
              ↓
            </span>
          </summary>
          <ul className="divide-y hairline mt-1">
            {hidden.map((item) => (
              <AdaptationHistoryRow key={item.modifierId} item={item} />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

/* ================================================================== *
 * Single row
 * ================================================================== */

function AdaptationHistoryRow({ item }: { item: AdaptationHistoryItem }) {
  const outcome = describeAdaptationOutcome({
    acceptedByMember: item.acceptedByMember,
    reviewedBy: item.reviewedBy,
  });
  const dateLabel = formatHistoryDate(item.createdAt);
  const actionLabel = labelForAction(item.modifierType);
  const sessionLine = item.sessionDayLabel ?? item.sessionTitle;
  const rpeLine = formatHistoryRpeDelta(item.topSetRpeDelta);
  const readinessLine = formatNextDayReadiness(item.nextDayReadiness);

  return (
    <li
      className={`py-3 ${outcome.tone === "dim" ? "opacity-65" : ""}`}
      data-tone={outcome.tone}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-fg-faint w-14 shrink-0 numeric">
            {dateLabel}
          </span>
          <span className="text-sm text-fg">{actionLabel}</span>
        </div>
        <span
          className={`text-[10px] font-mono uppercase tracking-[0.14em] shrink-0 ${
            outcome.tone === "pending" ? "text-warn" : "text-fg-dim"
          }`}
        >
          <span aria-hidden className="mr-1">
            {outcome.icon}
          </span>
          {outcome.label}
        </span>
      </div>

      {sessionLine || rpeLine || readinessLine ? (
        <div className="ml-[60px] mt-1 space-y-0.5">
          {sessionLine ? (
            <div className="text-[11px] text-fg-dim">Dag: {sessionLine}</div>
          ) : null}
          {rpeLine ? (
            <div className="text-[11px] font-mono text-fg-faint numeric">
              {rpeLine}
            </div>
          ) : null}
          {readinessLine ? (
            <div className="text-[11px] font-mono text-fg-faint">
              {readinessLine}
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
