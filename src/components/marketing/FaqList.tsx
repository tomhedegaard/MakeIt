"use client";

import { useState } from "react";

export type FaqItem = { q: string; a: string };

/**
 * FAQ with progressive disclosure (UX-audit B1).
 *
 * The list grew to 18 entries, which alone added several screens of
 * scroll to a page already 27 screens long. The first `initialCount`
 * answer the questions a first-time visitor actually has; the rest
 * stay one tap away instead of padding the page.
 *
 * Rendered client-side only for the toggle — the items themselves are
 * translated on the server and passed in as plain props, so no copy
 * moves into the bundle beyond what is displayed anyway.
 */
export default function FaqList({
  items,
  initialCount = 8,
  showAllLabel,
}: {
  items: FaqItem[];
  initialCount?: number;
  showAllLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, initialCount);
  const hasMore = items.length > initialCount;

  return (
    <div className="md:col-span-7">
      <ul className="border-t hairline">
        {visible.map((item, i) => (
          // Kun de server-renderede punkter får data-reveal:
          // RevealObserver scanner DOM'en én gang ved mount, så
          // punkter der først dukker op ved "vis alle" aldrig ville få
          // .is-visible — og ville stå på opacity 0 for evigt.
          <li
            key={item.q}
            {...(i < initialCount
              ? { "data-reveal": "", style: { transitionDelay: `${i * 60}ms` } }
              : {})}
            className="border-b hairline"
          >
            <details className="group">
              <summary
                className="flex items-start gap-4 py-5 cursor-pointer list-none touch-app"
                style={{ outline: "none" }}
              >
                <span className="numeric text-[11px] text-fg-faint w-7 shrink-0 mt-1.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 font-display text-lg md:text-xl leading-snug">
                  {item.q}
                </span>
                <span
                  aria-hidden
                  className="size-7 rounded-full surface-2 flex items-center justify-center text-fg-dim group-open:rotate-45 transition-transform shrink-0"
                >
                  +
                </span>
              </summary>
              <div className="pl-11 pr-4 pb-5 text-fg-dim text-sm md:text-base leading-relaxed">
                {item.a}
              </div>
            </details>
          </li>
        ))}
      </ul>

      {!expanded && hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-6 btn btn-sm"
        >
          {showAllLabel}
        </button>
      ) : null}
    </div>
  );
}
