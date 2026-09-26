"use client";

import { useEffect, useRef, useState } from "react";
import type { ExercisePhase } from "@/lib/data/exercises";
import { resolveDemoAssets } from "@/lib/data/demo-assets";
import { useVideoPhaseSync } from "./useVideoPhaseSync";
import { Play } from "lucide-react";
import { ICON } from "@/components/ui/icon";

/**
 * Compact session-chrome demo. Portrait (9:16) loop when a URL exists;
 * poster + play if autoplay is blocked. Phase index bubbles up so
 * the inline cue list can highlight in sync. Intentionally thinner
 * than ExerciseDemo — no figure toggles, no 220px detail column.
 */
export default function SessionExerciseDemo({
  demoAssetUrl,
  phases,
  onPhaseChange,
  label,
  playLabel,
  eyebrow,
}: {
  demoAssetUrl: string;
  phases: ExercisePhase[];
  onPhaseChange?: (phaseIdx: number) => void;
  label: string;
  playLabel: string;
  eyebrow: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const idx = useVideoPhaseSync(ref, phases);
  // The frame is 9:16, so the portrait cut plays here; the landscape
  // pair stays as later <source>s in case a portrait file is missing.
  const portrait = resolveDemoAssets(demoAssetUrl, "portrait");
  const landscape = resolveDemoAssets(demoAssetUrl);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (idx == null) return;
    onPhaseChange?.(idx);
  }, [idx, onPhaseChange]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const onPlay = () => setPaused(false);
    const onPause = () => setPaused(true);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    const t = window.setTimeout(() => {
      if (video.paused) setPaused(true);
    }, 350);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      window.clearTimeout(t);
    };
  }, [demoAssetUrl]);

  return (
    <figure
      data-session-demo=""
      className="shrink-0 w-[104px] space-y-1.5"
    >
      <div className="relative rounded-md surface overflow-hidden">
        <video
          ref={ref}
          data-session-demo-video=""
          autoPlay
          loop
          muted
          playsInline
          poster={portrait.poster}
          aria-label={label}
          className="block w-[104px] aspect-[9/16] object-cover bg-bg-3"
        >
          <source src={portrait.webm} type="video/webm" />
          <source src={portrait.mp4} type="video/mp4" />
          <source src={landscape.webm} type="video/webm" />
          <source src={landscape.mp4} type="video/mp4" />
        </video>
        {paused ? (
          <button
            type="button"
            onClick={() => {
              void ref.current?.play();
            }}
            aria-label={playLabel}
            className="absolute inset-0 flex items-center justify-center bg-bg/40 text-fg"
          >
            <Play {...ICON} className="size-7" />
          </button>
        ) : null}
      </div>
      <figcaption className="eyebrow text-center">{eyebrow}</figcaption>
    </figure>
  );
}
