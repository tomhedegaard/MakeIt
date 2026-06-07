"use client";

import { useEffect, useState } from "react";

type Pattern = "box_breath_4_4_4_4" | "coherence_5_5" | "wave_4_8" | "still_focus" | "none";

interface Phase {
  label: string;
  seconds: number;
  scale: number;
}

const PATTERNS: Record<Pattern, Phase[]> = {
  box_breath_4_4_4_4: [
    { label: "Ind", seconds: 4, scale: 1.5 },
    { label: "Hold", seconds: 4, scale: 1.5 },
    { label: "Ud", seconds: 4, scale: 1.0 },
    { label: "Hold", seconds: 4, scale: 1.0 },
  ],
  coherence_5_5: [
    { label: "Ind", seconds: 5, scale: 1.5 },
    { label: "Ud", seconds: 5, scale: 1.0 },
  ],
  wave_4_8: [
    { label: "Ind", seconds: 4, scale: 1.5 },
    { label: "Ud", seconds: 8, scale: 1.0 },
  ],
  still_focus: [
    { label: "Sid stille", seconds: 60, scale: 1.2 },
  ],
  none: [],
};

/**
 * Animated breathing ring tied to a visual_pattern. Pure-CSS scale
 * transition synced to the phase duration. The label updates as
 * phases cycle.
 */
export default function BreathingRing({ pattern }: { pattern: Pattern }) {
  const phases = PATTERNS[pattern];
  const [phaseIdx, setPhaseIdx] = useState(0);

  useEffect(() => {
    if (phases.length === 0) return;
    const current = phases[phaseIdx];
    if (!current) return;
    const id = setTimeout(() => {
      setPhaseIdx((i) => (i + 1) % phases.length);
    }, current.seconds * 1000);
    return () => clearTimeout(id);
  }, [phaseIdx, phases]);

  if (phases.length === 0) {
    return (
      <div className="aspect-square w-48 md:w-64 mx-auto rounded-full border hairline bg-bg-2/30" />
    );
  }

  const phase = phases[phaseIdx];
  if (!phase) return null;

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <div className="relative aspect-square w-48 md:w-64">
        <div
          className="absolute inset-0 rounded-full border-2 border-fg/40 bg-fg/5 transition-transform ease-in-out"
          style={{
            transform: `scale(${phase.scale})`,
            transitionDuration: `${phase.seconds * 1000}ms`,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center font-display text-2xl md:text-3xl text-fg">
          {phase.label}
        </div>
      </div>
      <div className="text-fg-dim text-xs uppercase tracking-wide">
        {pattern.replace(/_/g, " ")}
      </div>
    </div>
  );
}
