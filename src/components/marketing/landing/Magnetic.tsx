"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { magnetOffset } from "@/lib/marketing/landing/magnet";

/**
 * Pulls its child a little toward the pointer while the pointer is over
 * it, and lets go when it leaves. Writes `--mx` and `--my` on its own
 * span; globals.css turns them into a transform only for a fine pointer
 * with motion allowed, so touch, keyboard and reduced motion get the
 * plain button. Without JS the span is an ordinary inline wrapper.
 */
export default function Magnetic({ children, strength = 0.3 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window.matchMedia !== "function") return;
    const fine = window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!fine.matches) return;

    const move = (e: PointerEvent) => {
      const box = el.getBoundingClientRect();
      const { x, y } = magnetOffset(e.clientX, e.clientY, box, strength);
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);
    };
    const leave = () => {
      el.style.removeProperty("--mx");
      el.style.removeProperty("--my");
    };

    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      leave();
    };
  }, [strength]);

  return (
    <span ref={ref} data-magnet className="inline-flex">
      {children}
    </span>
  );
}
