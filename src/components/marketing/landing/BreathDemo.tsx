"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** The app's 4-7-8 breath (BreathScreen): seconds per phase. */
const PHASES = [
  { key: "in", s: 4 },
  { key: "hold", s: 7 },
  { key: "out", s: 8 },
] as const;
type PhaseKey = (typeof PHASES)[number]["key"];

export type BreathLabels = {
  start: string;
  again: string;
  stop: string;
  phases: Record<PhaseKey, string>;
  done: string;
  hint: string;
};

/**
 * One 4-7-8 breath, right on the page. The circle grows on the in-breath,
 * rests on the hold and shrinks on the out-breath, with the phase and the
 * seconds left in words (announced politely). With reduced motion the
 * circle stays put and only the words count.
 */
export default function BreathDemo({ labels }: { labels: BreathLabels }) {
  const [phase, setPhase] = useState<number | null>(null);
  const [left, setLeft] = useState(0);
  const [done, setDone] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => void (timer.current && window.clearInterval(timer.current)), []);

  function stop() {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    setPhase(null);
  }

  function start() {
    stop();
    setDone(false);
    let p = 0;
    let s: number = PHASES[0].s;
    setPhase(0);
    setLeft(s);
    timer.current = window.setInterval(() => {
      s -= 1;
      if (s > 0) return setLeft(s);
      p += 1;
      if (p >= PHASES.length) {
        stop();
        setDone(true);
        return;
      }
      s = PHASES[p].s;
      setPhase(p);
      setLeft(s);
    }, 1000);
  }

  const current = phase === null ? null : PHASES[phase];
  // Scale per phase; the transition length is the phase length, so the
  // circle moves for exactly as long as the breath does.
  const scale = current?.key === "in" || current?.key === "hold" ? 1 : 0.55;

  return (
    <div className="flex items-center gap-6 sm:gap-8">
      <div aria-hidden="true" className="relative grid size-[132px] flex-none place-items-center">
        <span className="absolute inset-0 rounded-full border border-mind-line" />
        <span
          className="absolute inset-0 rounded-full bg-mind transition-transform ease-in-out motion-reduce:transition-none"
          style={{ transform: `scale(${scale})`, transitionDuration: current ? `${current.s}s` : "0.6s" }}
        />
        <span className="relative font-display text-[34px] leading-none text-bg">{current ? left : ""}</span>
      </div>
      <div>
        <p aria-live="polite" className="font-display min-h-[1.2em] text-[clamp(24px,2.4vw,32px)] leading-tight">
          {current ? labels.phases[current.key] : done ? labels.done : labels.hint}
        </p>
        <button
          type="button"
          onClick={current ? stop : start}
          className={cn("btn btn-sm mt-4", current ? "" : "btn-primary")}
        >
          {current ? labels.stop : done ? labels.again : labels.start}
        </button>
      </div>
    </div>
  );
}
