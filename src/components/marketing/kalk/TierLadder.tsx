"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { TierKey } from "@/lib/marketing/tiers";

export type LadderTier = {
  key: TierKey;
  name: string;
  /** The plate's kg figure: the metaphor, not a rule. */
  kg: string;
  /** "1.000+ reps", already formatted for the locale. */
  floor: string;
  /** Mono line above the name: a marker ("Du er her") or the floor. */
  kicker: string;
  here: boolean;
  text: string;
  perks: string[];
  cta: string;
};

/**
 * Each tier as a bumper plate, lightest to heaviest (reference B
 * `.plates`). Sizes use container units, so the row scales with its
 * column.
 */
const PLATE: Record<TierKey, { basis: string; label: string; dark?: boolean }> = {
  lifter: { basis: "basis-[16%]", label: "text-[4cqi]" },
  athlete: { basis: "basis-[21%]", label: "text-[5.2cqi]" },
  beast: { basis: "basis-[26%]", label: "text-[6.4cqi]" },
  legend: { basis: "basis-[31%]", label: "text-[7.6cqi]", dark: true },
};

/** Arrow keys and Home/End move between tabs; other keys are left alone. */
export function nextTabIndex(key: string, i: number, count: number): number | null {
  if (key === "ArrowRight" || key === "ArrowDown") return (i + 1) % count;
  if (key === "ArrowLeft" || key === "ArrowUp") return (i - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

/**
 * The tier ladder as tabs. The four columns are the tabs (keyboard and
 * screen readers); the plates above are the same choice for the mouse
 * and finger, so they stay out of the tab order. The panel shows what
 * the chosen tier unlocks, full width under the ladder, and ends in the
 * call to action. It opens on the example member's own tier, so the
 * page reads the same without JS.
 */
export default function TierLadder({
  head,
  tiers,
  listLabel,
  hint,
  perksHeading,
  ctaHref,
  ctaNote,
}: {
  /** The section heading, left of the plates on wide screens. */
  head: ReactNode;
  tiers: LadderTier[];
  listLabel: string;
  hint: string;
  perksHeading: string;
  ctaHref: string;
  ctaNote: string;
}) {
  const id = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [selected, setSelected] = useState(() =>
    Math.max(
      0,
      tiers.findIndex((t) => t.here),
    ),
  );
  const tier = tiers[selected];

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const next = nextTabIndex(e.key, i, tiers.length);
    if (next === null) return;
    e.preventDefault();
    setSelected(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <>
      <div className="mt-[clamp(48px,6vw,90px)] grid items-end gap-[clamp(40px,6vw,96px)] lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        {head}
        <div>
          <span id="tiers" className="block scroll-mt-[88px]" />
          <div
            aria-hidden="true"
            className="relative flex items-center justify-between py-5 [container-type:inline-size] before:absolute before:inset-x-[-12px] before:top-1/2 before:z-0 before:h-3.5 before:-translate-y-1/2 before:rounded-[3px] before:bg-[linear-gradient(var(--bg-3),color-mix(in_oklab,var(--fg)_22%,var(--bg-3)))]"
          >
            {tiers.map((t, i) => (
              <Plate key={t.key} tier={t} selected={i === selected} onSelect={() => setSelected(i)} />
            ))}
          </div>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-dim">{hint}</p>

          <div
            role="tablist"
            aria-label={listLabel}
            className="mt-5 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-line-bright md:grid-cols-4"
          >
            {tiers.map((t, i) => {
              const on = i === selected;
              return (
                <button
                  key={t.key}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${id}-tab-${t.key}`}
                  aria-selected={on}
                  aria-controls={`${id}-panel`}
                  tabIndex={on ? 0 : -1}
                  data-tier={t.key}
                  onClick={() => setSelected(i)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  className={cn(
                    "relative -mt-px cursor-pointer border-t-2 pt-3.5 pb-2 text-left transition-colors duration-200 motion-reduce:transition-none",
                    "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fg",
                    on ? "border-signal" : "border-transparent hover:border-line-strong",
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.06em]",
                      t.here ? "text-fg" : "text-fg-dim",
                    )}
                  >
                    {t.here ? (
                      <i aria-hidden="true" className="inline-block size-1.5 flex-none rounded-full bg-signal" />
                    ) : null}
                    {t.kicker}
                  </span>
                  <span className="font-display mt-1 block text-[clamp(22px,2.2vw,30px)] leading-none!">{t.name}</span>
                  <span className={cn("mt-1.5 block text-[14px]", on ? "text-fg" : "text-fg-dim")}>{t.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${tier.key}`}
        data-tier-panel={tier.key}
        className={cn(
          "mt-[clamp(48px,6vw,80px)] grid gap-6 rounded-[14px] border p-[clamp(20px,2.6vw,32px)] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]",
          PLATE[tier.key].dark ? "border-fg bg-fg text-bg" : "border-line bg-bg-2",
        )}
      >
        <div className="flex flex-col">
          <p className="font-mono text-[12px] uppercase tracking-[0.06em] opacity-70">{tier.floor}</p>
          <p className="font-display mt-2 text-[clamp(44px,5vw,72px)] leading-[0.85]!">{tier.name}</p>
          <div className="mt-auto pt-6">
            <Link
              href={ctaHref}
              className={cn(
                "btn h-12! px-6!",
                PLATE[tier.key].dark
                  ? "border-bg! bg-bg! text-fg! hover:bg-transparent! hover:text-bg!"
                  : "btn-primary",
              )}
            >
              {tier.cta} <span aria-hidden="true">→</span>
            </Link>
            <p className="mt-3 max-w-[34ch] text-[13px] opacity-70">{ctaNote}</p>
          </div>
        </div>
        <div>
          <p className="font-mono text-[12px] uppercase tracking-[0.06em] opacity-70">{perksHeading}</p>
          <ul className="mt-2.5 list-none p-0">
            {tier.perks.map((perk) => (
              <li
                key={perk}
                className={cn(
                  "flex items-center gap-3 border-b py-[11px] text-base last:border-b-0",
                  PLATE[tier.key].dark ? "border-bg/15" : "border-line",
                )}
              >
                <svg
                  viewBox="0 0 12 12"
                  aria-hidden="true"
                  className="size-3 flex-none text-signal"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 6.4l2.6 2.4L10 3.2" />
                </svg>
                {perk}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

function Plate({ tier, selected, onSelect }: { tier: LadderTier; selected: boolean; onSelect: () => void }) {
  const plate = PLATE[tier.key];
  return (
    <div className={cn("relative z-[1] flex min-w-0 flex-none flex-col items-center", plate.basis)}>
      {/* Mouse and touch only: the tabs below carry the same choice for the keyboard. */}
      <div
        data-plate={tier.key}
        data-current={tier.here ? "true" : undefined}
        data-selected={selected ? "true" : undefined}
        onClick={onSelect}
        className={cn(
          "grid aspect-square w-full cursor-pointer place-items-center rounded-full border",
          "shadow-[0_18px_30px_-18px_color-mix(in_oklab,var(--fg)_50%,transparent)]",
          "transition-[translate,outline-color] duration-200 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
          plate.dark
            ? "border-fg bg-[repeating-radial-gradient(circle,color-mix(in_oklab,var(--fg)_88%,var(--bg))_0_6px,var(--fg)_6px_7px)]"
            : "border-line-bright bg-[repeating-radial-gradient(circle,var(--bg-2)_0_5px,var(--bg-3)_5px_6px)]",
          selected
            ? "outline-4 outline-offset-[5px] outline-signal"
            : "outline-4 outline-offset-[5px] outline-transparent",
        )}
      >
        <b
          className={cn(
            "font-display grid aspect-square w-[46%] place-items-center rounded-full border leading-none!",
            plate.label,
            plate.dark ? "border-[color-mix(in_oklab,var(--bg)_20%,var(--fg))] bg-fg text-bg" : "border-line bg-bg-2",
          )}
        >
          {tier.kg}
        </b>
      </div>
    </div>
  );
}
