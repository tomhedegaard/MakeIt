"use client";

import { useEffect, useRef, useState } from "react";
import AnatomyFigure from "@/components/anatomy/AnatomyFigure";
import type { AnatomyView } from "@/lib/data/muscle-groups";
import type { AnatomyGender } from "@/lib/data/anatomy/paths";
import type { ExercisePhase } from "@/lib/data/exercises";

/**
 * Cycles the AnatomyFigure through a list of phases so recruitment
 * shifts visually as the rep progresses. Auto-plays on mount, can be
 * paused. A thin progress bar fills during each phase via CSS
 * transition; phase pips below the bar show position in the cycle.
 *
 * Smoothness: the figure's per-muscle `fill` and `opacity` already
 * have CSS transitions, so handoff between phases reads as a fade
 * rather than a snap. Phase boundaries are driven by setTimeout —
 * no rAF loop, so React renders ~3-4 times per cycle.
 */
export default function PhaseAnimator({
  phases,
  view,
  gender,
  figureSize = { width: 220, height: 440 },
}: {
  phases: ExercisePhase[];
  view: AnatomyView;
  gender: AnatomyGender;
  figureSize?: { width: number; height: number };
}) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Advance to the next phase after the current one's duration.
  useEffect(() => {
    if (!playing || phases.length === 0) return;
    const dur = phases[idx]?.duration_ms ?? 1000;
    timer.current = setTimeout(() => {
      setIdx((i) => (i + 1) % phases.length);
    }, dur);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [idx, playing, phases]);

  if (phases.length === 0) return null;

  const phase = phases[idx];
  const totalMs = phases.reduce((sum, p) => sum + p.duration_ms, 0);

  return (
    <div className="flex flex-col items-center gap-3">
      <AnatomyFigure
        view={view}
        gender={gender}
        primary={phase.primary}
        secondary={phase.secondary}
        tertiary={phase.tertiary}
        style={figureSize}
      />

      {/* Phase label + duration */}
      <div className="flex items-baseline gap-3 text-fg-faint">
        <span className="font-display text-base text-fg">{phase.name}</span>
        <span className="text-[10px] font-mono uppercase tracking-[0.14em]">
          {(phase.duration_ms / 1000).toFixed(1)}s
        </span>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="ml-auto text-[10px] font-mono uppercase tracking-[0.14em] hover:text-fg transition-colors"
          aria-label={playing ? "Pause" : "Afspil"}
        >
          {playing ? "Pause" : "Play"}
        </button>
      </div>

      {/* Progress bar — CSS transition drives the smooth fill */}
      <ProgressBar idx={idx} durationMs={phase.duration_ms} playing={playing} />

      {/* Phase pips, sized proportional to their duration */}
      <div className="flex gap-1 w-full" aria-hidden>
        {phases.map((p, i) => (
          <div
            key={i}
            className={`h-0.5 rounded-full transition-colors ${
              i === idx ? "bg-fg" : i < idx ? "bg-fg-faint" : "bg-bg-3"
            }`}
            style={{ flex: p.duration_ms / totalMs }}
          />
        ))}
      </div>
    </div>
  );
}

function ProgressBar({
  idx,
  durationMs,
  playing,
}: {
  idx: number;
  durationMs: number;
  playing: boolean;
}) {
  // Reset to 0, then on the next paint set to 100 so the CSS
  // transition animates the fill linearly across `durationMs`.
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    setFilled(false);
    if (!playing) return;
    // Wait one paint so the transition catches the change.
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setFilled(true));
    });
    return () => cancelAnimationFrame(t);
  }, [idx, playing]);

  return (
    <div className="h-px w-full bg-bg-3 overflow-hidden">
      <div
        className="h-full bg-fg origin-left"
        style={{
          width: filled ? "100%" : "0%",
          transition: playing ? `width ${durationMs}ms linear` : "none",
        }}
      />
    </div>
  );
}
