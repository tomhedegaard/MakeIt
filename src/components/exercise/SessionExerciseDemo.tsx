"use client";

import { useEffect, useRef, useState } from "react";
import type { ExercisePhase } from "@/lib/data/exercises";
import { resolveDemoAssets } from "@/lib/data/demo-assets";
import { useVideoPhaseSync } from "./useVideoPhaseSync";
import { Pause, Play } from "lucide-react";
import { ICON } from "@/components/ui/icon";

/**
 * Compact session-chrome demo. Portrait (9:16) loop when a URL exists.
 * Starts on its own unless the member asked for reduced motion; a
 * 44 px toggle can always pause or resume it. Phase index bubbles up so
 * the inline cue list can highlight in sync. Intentionally thinner
 * than ExerciseDemo — no figure toggles, no 220px detail column.
 */
export default function SessionExerciseDemo({
  demoAssetUrl,
  phases,
  onPhaseChange,
  label,
  playLabel,
  pauseLabel,
  eyebrow,
}: {
  demoAssetUrl: string;
  phases: ExercisePhase[];
  onPhaseChange?: (phaseIdx: number) => void;
  label: string;
  playLabel: string;
  pauseLabel: string;
  eyebrow: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const idx = useVideoPhaseSync(ref, phases);
  // The frame is 9:16, so the portrait cut plays here; the landscape
  // pair stays as later <source>s in case a portrait file is missing.
  const portrait = resolveDemoAssets(demoAssetUrl, "portrait");
  const landscape = resolveDemoAssets(demoAssetUrl);
  const [paused, setPaused] = useState(true);

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
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // Autoplay can be refused by the browser; the toggle then stays on "play".
    if (!reduce) video.play().catch(() => setPaused(true));
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [demoAssetUrl]);

  return (
    <figure
      data-session-demo=""
      className="shrink-0 w-[104px] space-y-1.5"
    >
      <div className="relative surface overflow-hidden">
        <video
          ref={ref}
          data-session-demo-video=""
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
        <button
          type="button"
          data-session-demo-toggle=""
          onClick={() => {
            const video = ref.current;
            if (!video) return;
            if (video.paused) void video.play();
            else video.pause();
          }}
          aria-label={paused ? playLabel : pauseLabel}
          className="absolute bottom-0 right-0 size-11 flex items-center justify-center bg-bg text-fg border-l border-t hairline"
        >
          {paused ? <Play {...ICON} className="size-5" /> : <Pause {...ICON} className="size-5" />}
        </button>
      </div>
      <figcaption className="eyebrow text-center">{eyebrow}</figcaption>
    </figure>
  );
}
