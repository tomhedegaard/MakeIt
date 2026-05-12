"use client";

import { animate, useInView, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";

/**
 * Counts from 0 → target when scrolled into view.
 *
 * - Uses `Intl.NumberFormat` with the Danish locale so 50142 reads
 *   as "50.142".
 * - `pad` left-pads the integer with zeros (we use this for "07").
 * - Triggers once; subsequent scrolls don't replay.
 * - When `scramble` is true (the default), the value flickers
 *   through random digits for ~400ms before the actual count
 *   starts. The scramble phase writes textContent directly so it
 *   doesn't interfere with the motion-value animation that handles
 *   phase 2.
 */
export default function CountUp({
  to,
  duration = 1.6,
  pad = 0,
  scramble = true,
  className,
}: {
  to: number;
  duration?: number;
  pad?: number;
  scramble?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const mv = useMotionValue(0);
  const fmt = (n: number) => {
    const s = new Intl.NumberFormat("da-DK").format(Math.round(n));
    return pad > 0 ? s.padStart(pad, "0") : s;
  };
  const formatted = useTransform(mv, fmt);

  useEffect(() => {
    if (!inView) return;

    const SCRAMBLE_MS = scramble ? 420 : 0;

    // Phase 1 — visual scramble. We bypass the motion-value
    // entirely and write textContent directly; the motion-value
    // stays at 0 so its change-handler doesn't fire (and overwrite
    // our random digits) until phase 2 starts the animate() call.
    let scrambleId: ReturnType<typeof setInterval> | null = null;
    if (scramble && ref.current) {
      const endAt = Date.now() + SCRAMBLE_MS;
      scrambleId = setInterval(() => {
        if (Date.now() >= endAt) {
          if (scrambleId) clearInterval(scrambleId);
          return;
        }
        if (ref.current) {
          // Pick from a band roughly proportional to target so
          // digit count stays similar — feels like the number
          // is "locking in" rather than randomly resizing.
          const span = Math.max(to, 10);
          const rand = Math.floor(Math.random() * span * 1.4);
          ref.current.textContent = fmt(rand);
        }
      }, 45);
    }

    // Phase 2 — actual count from 0 to target, kicked off after
    // the scramble phase completes.
    const startId = setTimeout(() => {
      const controls = animate(mv, to, {
        duration,
        ease: [0.2, 0.7, 0.2, 1],
      });
      return () => controls.stop();
    }, SCRAMBLE_MS);

    return () => {
      if (scrambleId) clearInterval(scrambleId);
      clearTimeout(startId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  useEffect(() => {
    return formatted.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
  }, [formatted]);

  return (
    <span ref={ref} className={className}>
      {pad > 0 ? "0".repeat(pad) : "0"}
    </span>
  );
}
