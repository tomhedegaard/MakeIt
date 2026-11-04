"use client";

import { useEffect, useRef } from "react";

/**
 * The hero's one embodiment: on a fine pointer with motion allowed, the
 * island writes where the mouse is over the stage as `--px` / `--py`
 * (-1 to 1) on the section. CSS moves the lifter a few pixels toward it
 * and the copy the other way (`translate`, so the scroll keyframes on
 * `transform` still run). Leaving the stage eases both back. Same shape
 * as Magnetic: observe, write a variable, let CSS move.
 */
export default function HeroPointer() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const hero = ref.current?.closest<HTMLElement>("[data-hero]");
    if (!hero || typeof window.matchMedia !== "function") return;
    if (!window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;

    let raf = 0;
    let x = 0;
    let y = 0;
    const write = () => {
      raf = 0;
      hero.style.setProperty("--px", x.toFixed(3));
      hero.style.setProperty("--py", y.toFixed(3));
    };
    const move = (e: PointerEvent) => {
      const box = hero.getBoundingClientRect();
      x = ((e.clientX - box.left) / box.width) * 2 - 1;
      y = ((e.clientY - box.top) / Math.min(box.height, window.innerHeight)) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(write);
    };
    const leave = () => {
      x = 0;
      y = 0;
      if (!raf) raf = requestAnimationFrame(write);
    };

    hero.addEventListener("pointermove", move, { passive: true });
    hero.addEventListener("pointerleave", leave);
    return () => {
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerleave", leave);
      if (raf) cancelAnimationFrame(raf);
      hero.style.removeProperty("--px");
      hero.style.removeProperty("--py");
    };
  }, []);

  return <span ref={ref} hidden />;
}
