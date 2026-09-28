"use client";

import { useEffect, useRef } from "react";

/**
 * Flips `data-in-view="true"` on the closest `[data-night-curve]` figure
 * once it scrolls into view, so `.night-curve__path` (globals.css) can
 * draw itself with a stroke-dashoffset transition.
 *
 * Same IntersectionObserver-on-an-ancestor shape as MotorStoryRig (ref
 * + `closest()`, dataset write, disconnect on unmount) rather than a
 * second, different reveal mechanism. Kept as its own tiny client
 * island instead of reusing MotorStoryRig's observer, because that one
 * watches the four `article[data-step]` report lines further down the
 * section to drive `data-active`, a different signal than "has the
 * curve itself entered the viewport". The curve only needs to draw
 * once, so the observer disconnects after the first intersection.
 */
export default function NightCurveReveal() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>("[data-night-curve]");
    if (!root || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            root.dataset.inView = "true";
            io.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(root);

    return () => io.disconnect();
  }, []);

  return <span ref={ref} aria-hidden="true" className="hidden" />;
}
