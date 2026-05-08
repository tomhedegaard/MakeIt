"use client";

import { animate, useInView, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";

/**
 * Counts from 0 → target when the element scrolls into view.
 *
 * - Uses `Intl.NumberFormat` with the Danish locale so 50142 reads as "50.142".
 * - `pad` left-pads the integer with zeros (we use this for "07").
 * - Triggers once; subsequent scrolls don't replay.
 */
export default function CountUp({
  to,
  duration = 1.6,
  pad = 0,
  className,
}: {
  to: number;
  duration?: number;
  pad?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const mv = useMotionValue(0);
  const formatted = useTransform(mv, (v) => {
    const n = Math.round(v);
    const s = new Intl.NumberFormat("da-DK").format(n);
    return pad > 0 ? s.padStart(pad, "0") : s;
  });

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, to, {
      duration,
      ease: [0.2, 0.7, 0.2, 1],
    });
    return controls.stop;
  }, [inView, mv, to, duration]);

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
