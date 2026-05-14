"use client";

import AnatomyFigure from "@/components/anatomy/AnatomyFigure";
import type { MuscleGroup, AnatomyView } from "@/lib/data/muscle-groups";
import type { AnatomyGender } from "@/lib/data/anatomy/paths";
import type { ExercisePhase } from "@/lib/data/exercises";
import PhaseAnimator from "./PhaseAnimator";

/**
 * Demo column for the exercise detail page. Resolution order:
 *
 *  1. `demoAssetUrl` set → looping <video> (real production loop —
 *     see docs/EXERCISE_VISUAL_BRIEF.md for spec).
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
  posterUrl,
}: {
  demoAssetUrl: string | null;
  phases: ExercisePhase[];
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  tertiary: MuscleGroup[];
  view: AnatomyView;
  gender: AnatomyGender;
  posterUrl?: string | null;
}) {
  if (demoAssetUrl) {
    // Strip extension and resolve sibling formats. We expect WebM as
    // the primary asset and MP4 as the fallback — see brief.
    const base = demoAssetUrl.replace(/\.(webm|mp4)$/, "");
    return (
      <video
        autoPlay
        loop
        muted
        playsInline
        poster={posterUrl ?? undefined}
        className="rounded-lg w-full max-w-[240px]"
      >
        <source src={`${base}.webm`} type="video/webm" />
        <source src={`${base}.mp4`} type="video/mp4" />
      </video>
    );
  }

  if (phases.length > 0) {
    return <PhaseAnimator phases={phases} view={view} gender={gender} />;
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
