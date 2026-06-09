"use client";

import { useEffect, useRef } from "react";
import AnatomyFigure from "@/components/anatomy/AnatomyFigure";
import type { MuscleGroup, AnatomyView } from "@/lib/data/muscle-groups";
import type { AnatomyGender } from "@/lib/data/anatomy/paths";
import type { ExercisePhase } from "@/lib/data/exercises";
import { resolveDemoAssets } from "@/lib/data/demo-assets";
import PhaseAnimator from "./PhaseAnimator";
import { useVideoPhaseSync } from "./useVideoPhaseSync";

/**
 * Demo column for the exercise detail page. Resolution order:
 *
 *  1. `demoAssetUrl` set → looping <video> (real production loop —
 *     see docs/EXERCISE_VISUAL_BRIEF.md for spec). The webm/mp4/poster
 *     trio is resolved from the single stored URL via
 *     `resolveDemoAssets`; the poster still-frame is always derived.
 *     Phase sync runs off `video.currentTime` via useVideoPhaseSync.
 *  2. `phases[]` populated → PhaseAnimator cycles the AnatomyFigure
 *     so recruitment shifts visually across the rep.
 *  3. Otherwise → static AnatomyFigure with the exercise's overall
 *     primary / secondary / tertiary tiers.
 *
 * The static fallback is still better than nothing — it just doesn't
 * tell the recruitment-over-time story the other modes do.
 */
export default function ExerciseDemo({
  demoAssetUrl,
  phases,
  primary,
  secondary,
  tertiary,
  view,
  gender,
  onPhaseChange,
}: {
  demoAssetUrl: string | null;
  phases: ExercisePhase[];
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  tertiary: MuscleGroup[];
  view: AnatomyView;
  gender: AnatomyGender;
  /**
   * Forwarded to PhaseAnimator when that mode is active. Video and
   * static-figure modes don't emit phase changes (video sync is a
   * follow-up slice; static mode has no rep cycle).
   */
  onPhaseChange?: (phaseIdx: number) => void;
}) {
  if (demoAssetUrl) {
    return (
      <DemoVideo
        url={demoAssetUrl}
        phases={phases}
        onPhaseChange={onPhaseChange}
      />
    );
  }

  if (phases.length > 0) {
    return (
      <PhaseAnimator
        phases={phases}
        view={view}
        gender={gender}
        onPhaseChange={onPhaseChange}
      />
    );
  }

  return (
    <AnatomyFigure
      view={view}
      gender={gender}
      primary={primary}
      secondary={secondary}
      tertiary={tertiary}
      style={{ width: 220, height: 440 }}
    />
  );
}

/**
 * Video-mode demo. Owns the <video> ref, runs useVideoPhaseSync to
 * derive the active phase from `video.currentTime`, and bubbles it
 * up via `onPhaseChange` so the parent cue list highlights in sync.
 *
 * Listener is opt-in: if `phases` is empty or no handler is wired
 * the hook still runs but the parent state stays null — same as
 * before video sync existed, so legacy callers don't break.
 */
function DemoVideo({
  url,
  phases,
  onPhaseChange,
}: {
  url: string;
  phases: ExercisePhase[];
  onPhaseChange?: (phaseIdx: number) => void;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const idx = useVideoPhaseSync(ref, phases);
  const { webm, mp4, poster } = resolveDemoAssets(url);

  useEffect(() => {
    if (idx == null) return;
    onPhaseChange?.(idx);
  }, [idx, onPhaseChange]);

  return (
    <video
      ref={ref}
      autoPlay
      loop
      muted
      playsInline
      poster={poster}
      className="rounded-lg w-full max-w-[240px]"
    >
      <source src={webm} type="video/webm" />
      <source src={mp4} type="video/mp4" />
    </video>
  );
}
