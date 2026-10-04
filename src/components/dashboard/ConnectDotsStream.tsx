"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import DomainMark, { type Domain } from "@/components/brand/DomainMark";
import SectionHeader from "@/components/ui/SectionHeader";
import type {
  InsightCardId,
  InsightCardModel,
  InsightDomain,
} from "@/lib/dashboard/insight-stream";

export type DotsCopy = {
  title: string;
  moreAbout: string;
  dismiss: string;
  snooze: string;
  domains: Record<InsightDomain, string>;
  cards: Record<InsightCardId, { sentence: string; cta: string }>;
};

const STORAGE_KEY = "mi-adapt-dots";
const SAME_TAB_EVENT = "makeit:adapt-dots-changed";

type Stored = { hidden: string[]; snoozedUntil: Record<string, string> };

const EMPTY_STORE: Stored = { hidden: [], snoozedUntil: {} };
const EMPTY_JSON = JSON.stringify(EMPTY_STORE);

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseStore(raw: string): Stored {
  try {
    const parsed = JSON.parse(raw) as Stored;
    return {
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
      snoozedUntil: parsed.snoozedUntil ?? {},
    };
  } catch {
    return EMPTY_STORE;
  }
}

function readSnapshot(): string {
  if (typeof window === "undefined") return EMPTY_JSON;
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? EMPTY_JSON;
  } catch {
    return EMPTY_JSON;
  }
}

function subscribeToStorage(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(SAME_TAB_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SAME_TAB_EVENT, callback);
  };
}

function persist(next: Stored) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(SAME_TAB_EVENT));
  } catch {
    // localStorage full or disabled — drop silently
  }
}

function isVisible(card: InsightCardModel, store: Stored): boolean {
  if (store.hidden.includes(card.id)) return false;
  const until = store.snoozedUntil[card.id];
  if (until && until >= todayIso()) return false;
  return true;
}

/**
 * Ranked Today insight cards. Dismiss / snooze is local-only for v1.
 * The HQ gloss and "HQ · Adaptive Engine" live once, on the session
 * card's reason strip; repeating them here made the cards identical.
 */
export default function ConnectDotsStream({
  cards,
  copy,
}: {
  cards: InsightCardModel[];
  copy: DotsCopy;
}) {
  const storeJson = useSyncExternalStore(
    subscribeToStorage,
    readSnapshot,
    () => EMPTY_JSON,
  );
  const store = useMemo(() => parseStore(storeJson), [storeJson]);
  const visible = cards.filter((c) => isVisible(c, store));

  function hide(id: string) {
    persist({ ...store, hidden: [...store.hidden, id] });
  }

  function snooze(id: string) {
    persist({
      ...store,
      snoozedUntil: { ...store.snoozedUntil, [id]: todayIso() },
    });
  }

  if (visible.length === 0) return null;

  return (
    <section data-adapt-dots="" aria-label={copy.title} className="space-y-3">
      <SectionHeader title={copy.title} />

      <ul className="space-y-2.5">
        {visible.map((card) => {
          const cardCopy = copy.cards[card.id];
          return (
            <li
              key={card.id}
              data-insight-card={card.id}
              data-insight-domains={card.domains.join(" ")}
              className="surface-2 overflow-hidden"
            >
              <div className="px-5 pt-4 pb-3 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {card.domains.map((domain) => (
                    <span
                      key={domain}
                      data-domain={domain}
                      className="inline-flex items-center gap-1.5 border px-2 py-0.5"
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
                      <span className="text-micro">
                        {copy.domains[domain]}
                      </span>
                    </span>
                  ))}
                </div>

                <p className="text-copy text-fg-dim">
                  {cardCopy.sentence}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Secondary on purpose: "Start pas" is the page's one primary. */}
                  <Link href={card.ctaHref} className="btn">
                    {cardCopy.cta}
                  </Link>
                  <Link
                    href={card.moreHref}
                    data-more-about={card.moreAbout}
                    className="inline-flex min-h-11 items-center text-meta text-fg-dim hover:text-fg border hairline px-4"
                  >
                    {copy.moreAbout} {copy.domains[card.moreAbout]}
                  </Link>
                </div>
              </div>

              <div className="px-5 border-t hairline flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => hide(card.id)}
                  className="inline-flex min-h-11 items-center text-meta text-fg-faint hover:text-fg"
                >
                  {copy.dismiss}
                </button>
                <button
                  type="button"
                  onClick={() => snooze(card.id)}
                  className="inline-flex min-h-11 items-center text-meta text-fg-faint hover:text-fg"
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
