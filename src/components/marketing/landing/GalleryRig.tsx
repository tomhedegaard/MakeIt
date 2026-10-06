"use client";

import { useEffect, useRef } from "react";
import { galleryEnabled, galleryTravel } from "@/lib/marketing/landing/gallery";

/**
 * Switches the training wall into a pinned horizontal gallery on wide
 * screens (same shape as NightCurveReveal: a hidden span that finds its
 * block and writes to it). It sets `data-gallery="on"` on the closest
 * `[data-gallery]`, measures how far the track overflows the stage, and
 * writes that as `--gallery-len`. globals.css does the pinning and the
 * sideways travel with a view timeline, so there is no scroll listener.
 * Without JS, below 1024 px, on short screens, with reduced motion or
 * without view timelines the wall stays as it is.
 */
export default function GalleryRig() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>("[data-gallery]");
    const stage = root?.querySelector<HTMLElement>("[data-gallery-stage]");
    const track = root?.querySelector<HTMLElement>("[data-gallery-track]");
    if (!root || !stage || !track || typeof window.matchMedia !== "function") return;

    const wide = window.matchMedia("(min-width: 1024px)");
    const tall = window.matchMedia("(min-height: 760px)");
    const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const viewTimelines = typeof CSS !== "undefined" && CSS.supports?.("animation-timeline: view()") === true;

    // Back to the plain wall. The marker stays (empty) so the block can
    // still be found and switched on again, e.g. when a tablet rotates.
    const off = () => {
      root.dataset.gallery = "";
      root.style.removeProperty("--gallery-len");
    };

    const apply = () => {
      const enabled = galleryEnabled({
        wide: wide.matches,
        tall: tall.matches,
        motionOk: motion.matches,
        viewTimelines,
      });
      if (!enabled) return off();
      // Lay the track out as a row, then measure it in the same task:
      // reading scrollWidth forces that layout, and unlike a frame
      // callback it also runs in a background tab.
      root.dataset.gallery = "on";
      const travel = galleryTravel(track.scrollWidth, stage.clientWidth);
      if (travel === 0) return off();
      root.style.setProperty("--gallery-len", `${travel}px`);
    };

    apply();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(apply);
    ro?.observe(stage);
    for (const mq of [wide, tall, motion]) mq.addEventListener("change", apply);

    return () => {
      ro?.disconnect();
      for (const mq of [wide, tall, motion]) mq.removeEventListener("change", apply);
      off();
    };
  }, []);

  return <span ref={ref} hidden />;
}
