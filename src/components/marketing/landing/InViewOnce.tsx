"use client";

import { useEffect, useRef } from "react";

/**
 * One-shot entrance for a block (same shape as NightCurveReveal: a hidden
 * span that finds its block and writes to it). On mount it sets
 * `data-motion="armed"` on the closest `[data-once]`, so globals.css can
 * hold the block's pieces back, and flips it to `"run"` the first time
 * the block is in view, so they play in once. Without JS, with reduced
 * motion or without IntersectionObserver the attribute never appears and
 * the block stands in its resting state.
 */
export default function InViewOnce({ threshold = 0.35 }: { threshold?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>("[data-once]");
    if (!root || typeof IntersectionObserver === "undefined" || typeof window.matchMedia !== "function") return;
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;

    root.dataset.motion = "armed";
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        root.dataset.motion = "run";
        io.disconnect();
      },
      { threshold },
    );
    io.observe(root);

    return () => {
      io.disconnect();
      delete root.dataset.motion;
    };
  }, [threshold]);

  return <span ref={ref} hidden />;
}
