"use client";

import { useState } from "react";
import AnatomyFigure from "@/components/anatomy/AnatomyFigure";
import { MUSCLE_LABELS, type MuscleGroup, type AnatomyView } from "@/lib/data/muscle-groups";
import type { AnatomyGender } from "@/lib/data/anatomy/paths";

type Props = {
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  tertiary: MuscleGroup[];
  defaultView: AnatomyView;
  cues: string[];
};

const TIER_COLOR = {
  primary: "#F5F2EC",
  secondary: "#C97B3E",
  tertiary: "#C97B3E66",
} as const;

/**
 * Hero block on the exercise detail page. Pairs the anatomy figure
 * with the ordered coaching cues — together they communicate "what
 * happens" and "how to do it" without the user scrolling.
 *
 * View + gender toggles are local UI state. Default view is whatever
 * the exercise's dominant muscle direction implies (see
 * dominantView() in src/lib/data/exercises.ts).
 */
export default function ExerciseHero({
  primary,
  secondary,
  tertiary,
  defaultView,
  cues,
}: Props) {
  const [view, setView] = useState<AnatomyView>(defaultView);
  const [gender, setGender] = useState<AnatomyGender>("male");

  return (
    <div className="grid gap-8 md:grid-cols-[auto_1fr] md:gap-12 items-start">
      {/* Figure column */}
      <div className="flex flex-col items-center gap-4">
        <div className="surface-2 rounded-2xl p-6 lg:p-8">
          <AnatomyFigure
            view={view}
            gender={gender}
            primary={primary}
            secondary={secondary}
            tertiary={tertiary}
            style={{ width: 220, height: 440 }}
          />
        </div>

        {/* Toggles */}
        <div className="flex flex-col gap-2 w-full max-w-[260px]">
          <ToggleRow
            options={[
              { v: "front", label: "Forfra" },
              { v: "back", label: "Bagfra" },
            ]}
            value={view}
            onChange={(v) => setView(v as AnatomyView)}
          />
          <ToggleRow
            options={[
              { v: "male", label: "Mand" },
              { v: "female", label: "Kvinde" },
            ]}
            value={gender}
            onChange={(v) => setGender(v as AnatomyGender)}
          />
        </div>

        {/* Tier legend */}
        <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
          <Dot color={TIER_COLOR.primary} label="Primær" />
          <Dot color={TIER_COLOR.secondary} label="Sekundær" />
          <Dot color={TIER_COLOR.tertiary} label="Tertiær" />
        </div>
      </div>

      {/* Cues column */}
      <div className="space-y-6">
        <div>
          <div className="eyebrow mb-4">Sådan udfører du den</div>
          <ol className="space-y-3">
            {cues.map((cue, i) => (
              <li key={i} className="flex gap-4">
                <span className="font-display text-2xl text-fg-faint shrink-0 w-8 leading-none mt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-base md:text-lg leading-snug">{cue}</span>
              </li>
            ))}
          </ol>
        </div>

        <MuscleChips
          primary={primary}
          secondary={secondary}
          tertiary={tertiary}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  options,
  value,
  onChange,
}: {
  options: { v: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`flex-1 px-3 py-2 rounded-md text-xs font-mono uppercase tracking-[0.14em] ${
            value === o.v ? "bg-bg-3 text-fg" : "text-fg-dim hover:text-fg"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Dot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="size-2 rounded-full"
        style={{ background: color }}
        aria-hidden
      />
      {label}
    </span>
  );
}

function MuscleChips({
  primary,
  secondary,
  tertiary,
}: {
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  tertiary: MuscleGroup[];
}) {
  if (primary.length + secondary.length + tertiary.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="eyebrow">Muskler involveret</div>
      <div className="flex flex-wrap gap-1.5">
        {primary.map((m) => (
          <Chip key={m} label={MUSCLE_LABELS[m]} color={TIER_COLOR.primary} dark />
        ))}
        {secondary.map((m) => (
          <Chip key={m} label={MUSCLE_LABELS[m]} color={TIER_COLOR.secondary} dark />
        ))}
        {tertiary.map((m) => (
          <Chip key={m} label={MUSCLE_LABELS[m]} color={TIER_COLOR.tertiary} />
        ))}
      </div>
    </div>
  );
}

function Chip({
  label,
  color,
  dark = false,
}: {
  label: string;
  color: string;
  dark?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
      style={{
        background: color,
        color: dark ? "#0A0A0B" : "#F5F2EC",
      }}
    >
      {label}
    </span>
  );
}
