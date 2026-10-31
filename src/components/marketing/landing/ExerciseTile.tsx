"use client";

import { useEffect, useRef, useState } from "react";
import { resolveDemoAssets } from "@/lib/data/demo-assets";
import { cn } from "@/lib/utils";

/**
 * One still from the library that comes alive on hover, focus or tap.
 * The video is only mounted once asked for, so the wall stays light;
 * with reduced motion the still stays still. The tile is a button so the
 * keyboard and touch get the same thing the mouse does. A visitor who
 * presses it gets the loop even with reduced motion: an explicit gesture
 * outranks the preference (as in DemoLoop).
 *
 * Touch screens have no hover, so there the tile that stands in the
 * middle of the screen plays on its own as the visitor swipes the row
 * (an IntersectionObserver on a centre band), and stops when it leaves.
 */
export default function ExerciseTile({ slug, name, playLabel }: { slug: string; name: string; playLabel: string }) {
  const { webm, mp4, poster } = resolveDemoAssets(`/exercise-demos/${slug}.webm`);
  const [live, setLive] = useState(false);
  const [pinned, setPinned] = useState(false);
  const reduced = useRef(false);
  const ref = useRef<HTMLButtonElement>(null);
  // Mirrors `pinned` for the observer callback; written where pinned changes.
  const pinnedRef = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const el = ref.current;
    if (!el || reduced.current || typeof IntersectionObserver === "undefined") return;
    if (!window.matchMedia("(hover: none)").matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (pinnedRef.current) return;
        setLive(entry.isIntersecting);
      },
      { rootMargin: "-20% -42% -20% -42%" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const on = () => !reduced.current && setLive(true);
  const off = () => !pinned && setLive(false);

  return (
    <button
      ref={ref}
      type="button"
      aria-label={`${playLabel}: ${name}`}
      aria-pressed={live}
      onPointerEnter={(e) => e.pointerType === "mouse" && on()}
      onPointerLeave={(e) => e.pointerType === "mouse" && off()}
      onFocus={on}
      onBlur={() => {
        pinnedRef.current = false;
        setPinned(false);
        setLive(false);
      }}
      onClick={() => {
        // Tap or Enter pins the loop on; a second press stops it.
        const stop = live && pinned;
        pinnedRef.current = !stop;
        setPinned(!stop);
        setLive(!stop);
      }}
      className="group flex h-full w-full cursor-pointer flex-col bg-bg text-left text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
    >
      <span className="relative block aspect-[720/398] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- static poster from /public */}
        <img
          src={poster}
          alt=""
          loading="lazy"
          width={720}
          height={398}
          className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        {live ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            poster={poster}
            aria-hidden="true"
            className="absolute inset-0 size-full object-cover"
          >
            <source src={webm} type="video/webm" />
            <source src={mp4} type="video/mp4" />
          </video>
        ) : null}
      </span>
      <span className="mt-auto flex items-center justify-between gap-2 px-3 pb-3 pt-1 text-[14px]">
        {name}
        <span
          aria-hidden="true"
          className={cn(
            "size-2 rounded-full transition-colors duration-200",
            live ? "bg-signal" : "bg-line-strong group-hover:bg-fg-dim",
          )}
        />
      </span>
    </button>
  );
}
