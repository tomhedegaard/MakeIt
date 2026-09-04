"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      // Fixed marketing header is 3.5rem; match `scroll-mt-20` (5rem).
      anchors: { offset: -80, duration: 1.15 },
    });

    const hash = window.location.hash;
    if (hash.length > 1) {
      requestAnimationFrame(() => {
        lenis.scrollTo(hash, { offset: -80, immediate: true });
      });
    }

    let raf = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
