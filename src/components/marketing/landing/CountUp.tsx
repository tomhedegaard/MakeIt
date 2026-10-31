"use client";

import { useEffect, useRef, useState } from "react";
import { countUpAt } from "@/lib/marketing/landing/count-up";
import { formatNumber } from "@/lib/utils";

/**
 * A number that counts up from zero once, the first time it is in view.
 * The server renders the final value, so without JS or with reduced
 * motion the number simply stands. Screen readers get the final value
 * only; the moving digits are hidden from them.
 */
export default function CountUp({
  to,
  locale,
  delay = 0,
  duration = 1200,
}: {
  to: number;
  locale: string;
  /** ms after the number enters view, e.g. to wait for the plates. */
  delay?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(to);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined" || typeof window.matchMedia !== "function") return;
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;

    let raf = 0;
    let timer = 0;
    // Drop to zero just before the number scrolls into view, so the final
    // value never visibly jumps back. Count once most of it is visible.
    const arm = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        arm.disconnect();
        setShown(0);
      },
      { rootMargin: "0px 0px 25% 0px" },
    );
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        timer = window.setTimeout(() => {
          const start = performance.now();
          const tick = (now: number) => {
            const p = (now - start) / duration;
            setShown(countUpAt(p, to));
            if (p < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        }, delay);
      },
      { threshold: 0.6 },
    );
    arm.observe(el);
    io.observe(el);

    return () => {
      arm.disconnect();
      io.disconnect();
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [to, delay, duration]);

  return (
    <span ref={ref} className="numeric">
      <span aria-hidden="true">{formatNumber(shown, locale)}</span>
      <span className="sr-only">{formatNumber(to, locale)}</span>
    </span>
  );
}
