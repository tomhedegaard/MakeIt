"use client";

import { useEffect, useRef, useState } from "react";
import type { ExercisePhase } from "@/lib/data/exercises";
import { resolveDemoAssets } from "@/lib/data/demo-assets";
import { useVideoPhaseSync } from "./useVideoPhaseSync";

/**
 * The exercise's 3D loop as the page's hero, the same card as the
 * landing's form-check: landscape, full width, the render's own light
 * ground, a pause control in the corner. The worked muscles are lit in
 * the render itself, so there is no drawn figure beside it.
 *
 * Plays muted and looped. With reduced motion it starts on the poster
 * until the member presses play. The phase index still bubbles up, so
 * the cue list highlights in step with the video.
 */
export default function ExerciseLoop({
  url,
  phases,
  label,
  playLabel,
  pauseLabel,
  onPhaseChange,
}: {
  url: string;
  phases: ExercisePhase[];
  label: string;
  playLabel: string;
  pauseLabel: string;
  onPhaseChange?: (phaseIdx: number) => void;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const idx = useVideoPhaseSync(ref, phases);
  const { webm, mp4, poster } = resolveDemoAssets(url);
  // Mirrors what the element is actually doing, so the button never
  // claims to pause a still frame.
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (idx != null) onPhaseChange?.(idx);
  }, [idx, onPhaseChange]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    const reduced =
      typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) video.pause();
    else
      video.play().catch(() => {
        /* Autoplay refused: the poster and the play button stay. */
      });
    setPlaying(!video.paused);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [url]);

  function toggle() {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {
        /* The label stays on play. */
      });
    } else {
      video.pause();
    }
  }

  return (
    <figure data-exercise-loop="" className="relative overflow-hidden rounded-2xl border hairline bg-bg-2">
      <video
        ref={ref}
        key={url}
        muted
        loop
        playsInline
        preload="metadata"
        poster={poster}
        aria-label={label}
        className="block aspect-[720/398] w-full object-cover"
      >
        <source src={webm} type="video/webm" />
        <source src={mp4} type="video/mp4" />
      </video>
      <button
        type="button"
        aria-pressed={playing}
        onClick={toggle}
        className="btn btn-sm absolute right-3 top-3 md:right-4 md:top-4"
      >
        {playing ? pauseLabel : playLabel}
      </button>
    </figure>
  );
}
