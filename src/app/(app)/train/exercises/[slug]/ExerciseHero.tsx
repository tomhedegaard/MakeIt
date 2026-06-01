"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import ExerciseDemo from "@/components/exercise/ExerciseDemo";
import CuesList from "@/components/exercise/CuesList";
import { MUSCLE_LABELS, type MuscleGroup, type AnatomyView } from "@/lib/data/muscle-groups";
import type { AnatomyGender } from "@/lib/data/anatomy/paths";
import type { ExercisePhase } from "@/lib/data/exercises";

type Props = {
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  tertiary: MuscleGroup[];
  phases: ExercisePhase[];
  demoAssetUrl: string | null;
  defaultView: AnatomyView;
  cues: string[];
};

const TIER_COLOR = {
  primary: "#F5F2EC",
  secondary: "#C97B3E",
  tertiary: "#C97B3E66",
} as const;

/**
 * Hero block on the exercise detail page. Pairs the demo (video,
 * phase-animated figure, or static figure — picked by ExerciseDemo)
 * with the ordered coaching cues. View + gender toggles are local
 * UI state on the figure modes; the video mode ignores them.
 */
export default function ExerciseHero({
  primary,
  secondary,
  tertiary,
  phases,
  demoAssetUrl,
  defaultView,
  cues,
}: Props) {
  const [view, setView] = useState<AnatomyView>(defaultView);
  const [gender, setGender] = useState<AnatomyGender>("male");
  // Active phase index drives the cue list highlight. Stays null in
  // video / static-figure modes (no rep cycle to sync against); the
  // PhaseAnimator emits 0 on mount and on every advance.
  const [activePhaseIdx, setActivePhaseIdx] = useState<number | null>(null);
  // Stable identity so PhaseAnimator's onPhaseChange-effect doesn't
  // re-fire on every render of this component.
  const handlePhaseChange = useCallback(
    (idx: number) => setActivePhaseIdx(idx),
    [],
  );
  const t = useTranslations("Train.hero");

  return (
    <div className="grid gap-8 md:grid-cols-[auto_1fr] md:gap-12 items-start">
      {/* Demo column */}
      <div className="flex flex-col items-center gap-4">
        <div className="surface-2 rounded-2xl p-6 lg:p-8">
          <ExerciseDemo
            demoAssetUrl={demoAssetUrl}
            phases={phases}
            primary={primary}
            secondary={secondary}
            tertiary={tertiary}
            view={view}
            gender={gender}
            onPhaseChange={handlePhaseChange}
          />
        </div>

        {/* Toggles — hidden when a real video plays since orientation
            is baked into the asset. */}
        {!demoAssetUrl ? (
          <div className="flex flex-col gap-2 w-full max-w-[260px]">
            <ToggleRow
              options={[
                { v: "front", label: t("viewFront") },
                { v: "back", label: t("viewBack") },
              ]}
              value={view}
              onChange={(v) => setView(v as AnatomyView)}
            />
            <ToggleRow
              options={[
                { v: "male", label: t("genderMale") },
                { v: "female", label: t("genderFemale") },
              ]}
              value={gender}
              onChange={(v) => setGender(v as AnatomyGender)}
            />
          </div>
        ) : null}

        <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
          <Dot color={TIER_COLOR.primary} label={t("tierPrimary")} />
          <Dot color={TIER_COLOR.secondary} label={t("tierSecondary")} />
          <Dot color={TIER_COLOR.tertiary} label={t("tierTertiary")} />
        </div>
      </div>

      {/* Cues column */}
      <div className="space-y-6">
        <div>
          <div className="eyebrow mb-4">{t("howTo")}</div>
          <CuesList
            cues={cues}
            phases={phases}
            activePhaseIdx={activePhaseIdx}
          />
        </div>

        <MuscleChips
          primary={primary}
          secondary={secondary}
          tertiary={tertiary}
          title={t("musclesInvolved")}
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
  title,
}: {
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  tertiary: MuscleGroup[];
  title: string;
}) {
  if (primary.length + secondary.length + tertiary.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="eyebrow">{title}</div>
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
