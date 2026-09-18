"use client";

import { useEffect, useRef, useState } from "react";
import { resolveDemoAssets } from "@/lib/data/demo-assets";
import { shouldPlay } from "@/lib/marketing/demo-loop";

/**
 * Looping exercise demo for the marketing pages (spec 2026-09-17 §3.4).
 *
 * The markup never autoplays: the effect starts playback only while the
 * loop is on screen, the video can play, motion is allowed and the
 * visitor has not paused it. With reduced motion the poster frame is the
 * static end state. The render's light ground multiplies into the card.
 */
export default function DemoLoop({
  src,
  label,
  pauseLabel,
  playLabel,
  className,
  tag,
  compact = false,
  tint,
}: {
  src: string;
  label: string;
  pauseLabel: string;
  playLabel: string;
  className?: string;
  /** Optional overlay label, e.g. "Reference". */
  tag?: string;
  /** Smaller pause control for loops inside a marketing phone. */
  compact?: boolean;
  /** Optional domain wash over the clip, e.g. inside the Kalk bento. */
  tint?: "body" | "food" | "mind";
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [userPaused, setUserPaused] = useState(false);
  const { webm, mp4, poster } = resolveDemoAssets(src);

  // Playback inputs live in a ref so toggling pause does not rebuild
  // the observers (and briefly forget that the loop is in view).
  const playback = useRef({ inView: false, reducedMotion: false, ready: false, userPaused: false });
  const syncRef = useRef<() => void>(() => {});

  useEffect(() => {
    const wrap = wrapRef.current;
    const video = videoRef.current;
    if (!wrap || !video) return;
    const state = playback.current;
    state.ready = video.readyState >= 2;

    const motion =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    state.reducedMotion = motion?.matches ?? false;

    const sync = () => {
      // preload="metadata" keeps the page light, but some browsers
      // never buffer further on their own; ask for data once in view.
      if (state.inView && !state.ready && video.preload !== "auto") video.preload = "auto";
      if (shouldPlay(state)) {
        video.play().catch(() => {
          /* Playback can be refused; the poster stays. */
        });
      } else if (!video.paused) {
        video.pause();
      }
    };
    syncRef.current = sync;

    const onMotion = (e: MediaQueryListEvent) => {
      state.reducedMotion = e.matches;
      sync();
    };
    const onReady = () => {
      state.ready = true;
      sync();
    };

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver === "function") {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) state.inView = entry.isIntersecting;
          sync();
        },
        { threshold: 0.35 },
      );
      observer.observe(wrap);
    }

    motion?.addEventListener("change", onMotion);
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("canplay", onReady);
    sync();

    return () => {
      syncRef.current = () => {};
      observer?.disconnect();
      motion?.removeEventListener("change", onMotion);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("canplay", onReady);
    };
  }, []);

  useEffect(() => {
    playback.current.userPaused = userPaused;
    syncRef.current();
  }, [userPaused]);

  return (
    <div
      ref={wrapRef}
      className={`relative overflow-hidden rounded-[14px] bg-bg-2 ${className ?? ""}`}
    >
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="metadata"
        poster={poster}
        aria-label={label}
        className="absolute inset-0 h-full w-full object-cover mix-blend-multiply"
      >
        <source src={webm} type="video/webm" />
        <source src={mp4} type="video/mp4" />
      </video>
      {tint ? (
        <div aria-hidden="true" data-tint={tint} data-domain={tint} className="absolute inset-0 bg-domain-tint" />
      ) : null}
      {tag ? (
        <span className="absolute bottom-2 left-2 rounded-md bg-fg px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-bg">
          {tag}
        </span>
      ) : null}
      <button
        type="button"
        aria-pressed={userPaused}
        onClick={() => setUserPaused((p) => !p)}
        className={
          compact
            ? "btn btn-sm absolute right-2 top-2 h-7! px-2.5! text-[9px]!"
            : "btn btn-sm absolute right-3 top-3"
        }
      >
        {userPaused ? playLabel : pauseLabel}
      </button>
    </div>
  );
}
