"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { TierKey } from "@/lib/marketing/tiers";
import { Check } from "lucide-react";
import { ICON } from "@/components/ui/icon";
import Magnetic from "./Magnetic";

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
/**
 * The plates in side profile, as they sit on a loaded barbell sleeve
 * (Nord, spec §11): flat rectangles, radius 0, 1 px line. Height follows
 * the real plate (5 kg is small, 20 and 25 kg share the 450 mm disc and
 * 25 is the thicker one); width is the plate's thickness.
 */
const PLATE: Record<TierKey, { height: string; width: string }> = {
  lifter: { height: "h-[46%]", width: "w-[clamp(26px,3.4vw,48px)]" },
  athlete: { height: "h-[66%]", width: "w-[clamp(32px,4.4vw,62px)]" },
  beast: { height: "h-[100%]", width: "w-[clamp(40px,5.6vw,80px)]" },
  legend: { height: "h-[100%]", width: "w-[clamp(50px,7vw,100px)]" },
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
  after,
}: {
  /** The section heading, left of the plates on wide screens. */
  head: ReactNode;
  tiers: LadderTier[];
  listLabel: string;
  hint: string;
  perksHeading: string;
  ctaHref: string;
  ctaNote: string;
  /**
   * Cards that follow the panel in the same stack (globals.css
   * `[data-stack]`): on wide screens the panel holds under the nav and
   * these slide up over it. Each carries `data-stack-card` and its place
   * as `data-stack-i`; the panel is 0.
   */
  after?: ReactNode;
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
  /** Plates up to the member's own tier are on the bar; the rest wait. */
  const here = Math.max(0, tiers.findIndex((t) => t.here));
  // Legend's panel is the ink narrative band (spec §5 fortællebånd).
  const legendPanel = tier.key === "legend";

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
          {/* A barbell sleeve seen from the side: a 4 px bar, the four
              plates loaded along it, the weight under each. Decorative for
              assistive tech — the tabs below carry the same choice. */}
          <div aria-hidden="true" className="relative grid grid-cols-4 pt-4">
            <span className="absolute inset-x-0 top-[calc(1rem+clamp(90px,12vw,150px))] h-2.5 -translate-y-1/2 bg-fg" />
            {tiers.map((t, i) => (
              <Plate key={t.key} tier={t} loaded={i <= here} selected={i === selected} onSelect={() => setSelected(i)} />
            ))}
          </div>
          <p className="mt-1 text-micro text-fg-dim">{hint}</p>

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
                      "flex items-center gap-1.5 text-micro",
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

      <div data-stack className="mt-[clamp(48px,6vw,80px)] grid gap-[clamp(48px,6vw,80px)]">
        <div
          role="tabpanel"
          id={`${id}-panel`}
          aria-labelledby={`${id}-tab-${tier.key}`}
          data-tier-panel={tier.key}
          data-stack-card
          data-stack-i="0"
          className={cn(
            "grid gap-6 border p-[clamp(20px,2.6vw,32px)] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]",
            legendPanel ? "border-fg bg-fg text-bg" : "border-line bg-bg-2",
          )}
        >
          <div className="flex flex-col">
            <p className="text-[12px] opacity-70">{tier.floor}</p>
            <p className="font-display mt-2 text-[clamp(44px,5vw,72px)] leading-[0.85]!">{tier.name}</p>
            <div className="mt-auto pt-6">
              <Magnetic>
                <Link
                  href={ctaHref}
                  className={cn(
                    "btn h-12! px-6!",
                    legendPanel
                      ? "border-bg! bg-bg! text-fg! hover:bg-transparent! hover:text-bg!"
                      : "btn-primary",
                  )}
                >
                  {tier.cta} <span aria-hidden="true">→</span>
                </Link>
              </Magnetic>
              <p className="mt-3 max-w-[34ch] text-[13px] opacity-70">{ctaNote}</p>
            </div>
          </div>
          <div>
            <p className="text-[12px] opacity-70">{perksHeading}</p>
            <ul className="mt-2.5 list-none p-0">
              {tier.perks.map((perk) => (
                <li
                  key={perk}
                  className={cn(
                    "flex items-center gap-3 border-b py-[11px] text-base last:border-b-0",
                    legendPanel ? "border-bg/15" : "border-line",
                  )}
                >
                  <Check {...ICON} className={cn("size-3 flex-none", legendPanel ? "text-bg" : "text-signal")} />
                  {perk}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {after}
      </div>
    </>
  );
}

function Plate({
  tier,
  loaded,
  selected,
  onSelect,
}: {
  tier: LadderTier;
  loaded: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const plate = PLATE[tier.key];
  return (
    <div
      data-plate={tier.key}
      data-current={tier.here ? "true" : undefined}
      data-loaded={loaded ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
      onClick={onSelect}
      className="group relative z-[1] flex cursor-pointer flex-col items-center"
    >
      {/* Mouse and touch only: the tabs below carry the same choice for the keyboard. */}
      <div className="flex h-[clamp(180px,24vw,300px)] items-center">
        <span
          className={cn(
            "relative flex items-center justify-center outline-offset-[5px] transition-[outline-color] duration-200 motion-reduce:transition-none",
            plate.height,
            plate.width,
            selected ? "outline-2 outline-signal" : "outline-2 outline-transparent",
          )}
        >
          {/* The hub: the raised collar round the sleeve hole, which is
              what makes a rectangle read as a plate in side view. */}
          <span
            className={cn(
              "absolute h-[clamp(26px,3vw,40px)] w-[calc(100%+10px)] border transition-colors duration-200 motion-reduce:transition-none",
              loaded ? "border-fg bg-fg-dim" : "border-line-strong bg-bg-3",
            )}
          />
          <span
            className={cn(
              "relative block h-full w-full border transition-colors duration-200 motion-reduce:transition-none",
              loaded ? "border-fg bg-fg" : "border-line-strong bg-bg group-hover:bg-bg-2",
            )}
          />
        </span>
      </div>
      <b
        className={cn(
          "mt-4 font-display text-[clamp(22px,2.4vw,34px)] tabular-nums leading-none!",
          loaded || selected ? "text-fg" : "text-fg-dim group-hover:text-fg",
        )}
      >
        {tier.kg}
        <span className="ml-0.5 text-micro font-normal text-fg-dim">kg</span>
      </b>
      {tier.here ? <span className="mt-2 block h-0.5 w-5 bg-signal" /> : <span className="mt-2 block h-0.5 w-5" />}
    </div>
  );
}
