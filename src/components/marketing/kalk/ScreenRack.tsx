"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Arrow keys move the rack one screen; other keys are left alone. */
export function rackDirection(key: string): 1 | -1 | null {
  if (key === "ArrowRight") return 1;
  if (key === "ArrowLeft") return -1;
  return null;
}

/** Reduced motion jumps straight to the next screen. */
export function rackBehavior(reducedMotion: boolean): ScrollBehavior {
  return reducedMotion ? "auto" : "smooth";
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Track padding that lines the first screen up with the 1360 px page column. */
const GUTTER =
  "px-[max(1rem,calc((100%_-_1360px)/2_+_1rem))] scroll-px-[max(1rem,calc((100%_-_1360px)/2_+_1rem))] md:px-[max(2rem,calc((100%_-_1360px)/2_+_2rem))] md:scroll-px-[max(2rem,calc((100%_-_1360px)/2_+_2rem))]";

/**
 * Swipeable row of app screens (reference B `.rack`, `.track`, `.rbtn`).
 * Native CSS scroll-snap does the swiping; the buttons and arrow keys
 * move one screen at a time. One IntersectionObserver tracks which
 * screens are fully in view: that drives the position counter and
 * disables the buttons at the ends, so there is no scroll listener. The buttons use `aria-disabled`, not `disabled`, so
 * keyboard focus stays on them at the ends. Without JS the row still
 * scrolls and snaps.
 */
export default function ScreenRack({
  id,
  listLabel,
  prevLabel,
  nextLabel,
  items,
  head,
  tag,
}: {
  id: string;
  listLabel: string;
  prevLabel: string;
  nextLabel: string;
  items: { key: string; node: ReactNode }[];
  /** Heading block shown left of the controls. */
  head?: ReactNode;
  /** Small label beside the buttons, e.g. "Eksempeldata". */
  tag?: string;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [visible, setVisible] = useState<number[]>([0]);
  const total = items.length;
  // How far in the visitor has seen: the last screen fully in view.
  const seenTo = visible.length ? Math.max(...visible) : 0;
  const atStart = visible.includes(0);
  const atEnd = visible.includes(total - 1);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof IntersectionObserver === "undefined") return;
    const lis = Array.from(track.children);
    const seen = new Set<number>();

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const i = lis.indexOf(entry.target);
          if (entry.intersectionRatio > 0.9) seen.add(i);
          else seen.delete(i);
        }
        setVisible([...seen]);
      },
      { root: track, threshold: [0, 0.9, 1] },
    );
    for (const li of lis) io.observe(li);
    return () => io.disconnect();
  }, [total]);

  function go(dir: 1 | -1) {
    const track = trackRef.current;
    const item = track?.querySelector("li");
    if (!track || !item) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const reduced =
      typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: dir * (item.getBoundingClientRect().width + gap), behavior: rackBehavior(reduced) });
  }

  function onKeyDown(e: KeyboardEvent<HTMLUListElement>) {
    const dir = rackDirection(e.key);
    if (dir === null) return;
    e.preventDefault();
    go(dir);
  }

  return (
    <>
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-end justify-between gap-6 px-4 md:px-8">
        {head}
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" data-rack-count className="mr-1 font-mono text-[11px] tabular-nums tracking-[0.08em] text-fg-dim">
            {pad(seenTo + 1)} / {pad(total)}
          </span>
          {tag ? (
            <span className="rounded-full border border-line-bright px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-fg-dim">
              {tag}
            </span>
          ) : null}
          <RackButton controls={id} label={prevLabel} disabled={atStart} onClick={() => go(-1)} path="M12.5 4L6.5 10l6 6" />
          <RackButton controls={id} label={nextLabel} disabled={atEnd} onClick={() => go(1)} path="M7.5 4l6 6-6 6" />
        </div>
      </div>

      <ul
        ref={trackRef}
        id={id}
        tabIndex={0}
        aria-label={listLabel}
        onKeyDown={onKeyDown}
        className={cn(
          "mt-9 flex snap-x snap-mandatory list-none gap-[clamp(24px,3vw,48px)] overflow-x-auto overscroll-x-contain pb-[30px] pt-2.5",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:rounded-[14px] focus-visible:outline-offset-[-3px]",
          GUTTER,
        )}
      >
        {items.map((item) => (
          <li key={item.key} className="flex-none snap-start">
            {item.node}
          </li>
        ))}
      </ul>
    </>
  );
}

function RackButton({
  controls,
  label,
  disabled,
  onClick,
  path,
}: {
  controls: string;
  label: string;
  disabled: boolean;
  onClick: () => void;
  path: string;
}) {
  return (
    <button
      type="button"
      aria-controls={controls}
      aria-label={label}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={cn(
        "grid size-[52px] place-items-center rounded-full border border-line-bright bg-bg-2 text-fg",
        "transition-[background-color,color,opacity] duration-200 motion-reduce:transition-none",
        "aria-disabled:cursor-default aria-disabled:opacity-35",
        "cursor-pointer aria-[disabled=false]:hover:bg-fg aria-[disabled=false]:hover:text-bg",
      )}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true" className="size-[18px]">
        <path d={path} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
