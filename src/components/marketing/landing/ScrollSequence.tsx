"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { frameIndexFor, frameUrl, loadOrder, progressThrough } from "@/lib/marketing/landing/scroll-sequence";

type Props = {
  /** Frame path without the index and extension: `/landing/a1/a1-squat-frame`. */
  base: string;
  frameCount: number;
  /** Shown before the frames arrive, without JS, and under reduced motion. */
  poster: { src: string; alt: string; width: number; height: number };
  /** Part of the scroll travel the sequence plays over; the rest holds the first or last frame. */
  range?: { start: number; end: number };
  className?: string;
};

/**
 * Scroll-scrubbed image sequence (asset A1). The poster `<img>` is the
 * resting state: it is what the page shows at first paint, without JS,
 * and when the visitor prefers reduced motion. Once JS runs and motion
 * is allowed, the frames load in coarse-then-fine order and a canvas
 * takes over, drawing the frame that matches how far the block has
 * travelled through the viewport. Only `transform`-free canvas draws,
 * one per animation frame at most, and nothing while the block is off
 * screen (an IntersectionObserver arms and disarms the scroll listener).
 */
export default function ScrollSequence({ base, frameCount, poster, range, className }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = wrap.current;
    const cv = canvas.current;
    if (!root || !cv || typeof IntersectionObserver === "undefined") return;
    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const frames: (HTMLImageElement | undefined)[] = new Array(frameCount);
    let drawn = -1;
    let raf = 0;
    let armed = false;
    let disposed = false;

    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(root.clientWidth * dpr);
      cv.height = Math.round(root.clientHeight * dpr);
      drawn = -1;
    };

    const nearest = (index: number) => {
      // The exact frame if it has arrived, else the closest loaded one.
      for (let d = 0; d < frameCount; d += 1) {
        if (frames[index - d]?.complete) return frames[index - d];
        if (frames[index + d]?.complete) return frames[index + d];
      }
      return undefined;
    };

    const draw = () => {
      raf = 0;
      const box = root.getBoundingClientRect();
      const p = progressThrough(box.top, box.height, window.innerHeight);
      const index = frameIndexFor(p, frameCount, range);
      const img = nearest(index);
      if (!img || index === drawn) return;
      drawn = index;
      const scale = Math.max(cv.width / img.naturalWidth, cv.height / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.drawImage(img, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
      root.dataset.sequence = "live";
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };

    const load = (order: number[], i: number) => {
      if (disposed || i >= order.length) return;
      const index = order[i];
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        schedule();
        load(order, i + 1);
      };
      img.onerror = () => load(order, i + 1);
      img.src = frameUrl(base, index);
      frames[index] = img;
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !armed) {
          armed = true;
          window.addEventListener("scroll", schedule, { passive: true });
          schedule();
        } else if (!entry.isIntersecting && armed) {
          armed = false;
          window.removeEventListener("scroll", schedule);
        }
      },
      { rootMargin: "20% 0px 20% 0px" },
    );

    size();
    window.addEventListener("resize", size);
    io.observe(root);
    load(loadOrder(frameCount), 0);

    return () => {
      disposed = true;
      io.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", size);
      if (raf) cancelAnimationFrame(raf);
      delete root.dataset.sequence;
    };
  }, [base, frameCount, range]);

  return (
    <div ref={wrap} data-scroll-sequence className={cn("group/seq relative", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- poster is sized by the caller and swapped for canvas frames */}
      <img
        src={poster.src}
        alt={poster.alt}
        width={poster.width}
        height={poster.height}
        className="block h-full w-full object-cover"
      />
      <canvas
        ref={canvas}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0 transition-opacity duration-300 motion-reduce:transition-none group-data-[sequence=live]/seq:opacity-100"
      />
    </div>
  );
}
