"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import DomainMark, { type Domain } from "@/components/brand/DomainMark";
import type {
  InsightCardId,
  InsightCardModel,
  InsightDomain,
} from "@/lib/dashboard/insight-stream";

export type DotsCopy = {
  eyebrow: string;
  title: string;
  moreAbout: string;
  dismiss: string;
  snooze: string;
  domains: Record<InsightDomain, string>;
  cards: Record<InsightCardId, { sentence: string; cta: string }>;
};

const STORAGE_KEY = "mi-adapt-dots";

type Stored = { hidden: string[]; snoozedUntil: Record<string, string> };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function readStore(): Stored {
  if (typeof window === "undefined") return { hidden: [], snoozedUntil: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { hidden: [], snoozedUntil: {} };
    const parsed = JSON.parse(raw) as Stored;
    return {
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
      snoozedUntil: parsed.snoozedUntil ?? {},
    };
  } catch {
    return { hidden: [], snoozedUntil: {} };
  }
}

const EMPTY_STORE: Stored = { hidden: [], snoozedUntil: {} };

function writeStore(next: Stored) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/** Same-tab localStorage store — no mount setState (eslint react-hooks). */
let cached: Stored | null = null;
const listeners = new Set<() => void>();

function getClientSnapshot(): Stored {
  if (!cached) cached = readStore();
  return cached;
}

function getServerSnapshot(): Stored {
  return EMPTY_STORE;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function commit(next: Stored) {
  cached = next;
  writeStore(next);
  listeners.forEach((fn) => fn());
}

function isVisible(card: InsightCardModel, store: Stored): boolean {
  if (store.hidden.includes(card.id)) return false;
  const until = store.snoozedUntil[card.id];
  if (until && until >= todayIso()) return false;
  return true;
}

/**
 * Ranked Today insight cards. Dismiss / snooze is local-only for v1.
 */
export default function ConnectDotsStream({
  cards,
  copy,
}: {
  cards: InsightCardModel[];
  copy: DotsCopy;
}) {
  const store = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const visible = cards.filter((c) => isVisible(c, store));

  function hide(id: string) {
    commit({ ...store, hidden: [...store.hidden, id] });
  }

  function snooze(id: string) {
    commit({
      ...store,
      snoozedUntil: { ...store.snoozedUntil, [id]: todayIso() },
    });
  }

  if (visible.length === 0) return null;

  return (
    <section data-adapt-dots="" aria-label={copy.title} className="space-y-3">
      <div>
        <div className="eyebrow mb-1">{copy.eyebrow}</div>
        <h2 className="font-display text-2xl md:text-3xl leading-none">
          {copy.title}
        </h2>
      </div>

      <ul className="space-y-2.5">
        {visible.map((card) => {
          const cardCopy = copy.cards[card.id];
          return (
            <li
              key={card.id}
              data-insight-card={card.id}
              data-insight-domains={card.domains.join(" ")}
              className="surface-2 rounded-2xl overflow-hidden"
            >
              <div className="px-5 pt-4 pb-3 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {card.domains.map((domain) => (
                    <span
                      key={domain}
                      data-domain={domain}
                      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5"
                      style={{
                        background: "var(--domain-tint)",
                        borderColor: "var(--domain-line)",
                        color: "var(--domain)",
                      }}
                    >
                      <DomainMark
                        domain={domain as Domain}
                        className="size-3.5"
                      />
                      <span className="text-[10px] font-mono uppercase tracking-[0.14em]">
                        {copy.domains[domain]}
                      </span>
                    </span>
                  ))}
                </div>

                <p className="text-sm md:text-base text-fg-dim leading-relaxed">
                  {cardCopy.sentence}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <Link href={card.ctaHref} className="btn btn-sm btn-primary">
                    {cardCopy.cta}
                  </Link>
                  <Link
                    href={card.moreHref}
                    data-more-about={card.moreAbout}
                    className="text-[11px] font-mono uppercase tracking-[0.14em] text-fg-dim hover:text-fg border hairline rounded-full px-3 py-1.5"
                  >
                    {copy.moreAbout} {copy.domains[card.moreAbout]}
                  </Link>
                </div>
              </div>

              <div className="px-5 py-2 border-t hairline flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => hide(card.id)}
                  className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint hover:text-fg"
                >
                  {copy.dismiss}
                </button>
                <button
                  type="button"
                  onClick={() => snooze(card.id)}
                  className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint hover:text-fg"
                >
                  {copy.snooze}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
