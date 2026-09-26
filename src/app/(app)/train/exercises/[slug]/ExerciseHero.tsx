"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import ExerciseDemo from "@/components/exercise/ExerciseDemo";
import ExerciseLoop from "@/components/exercise/ExerciseLoop";
import CuesList from "@/components/exercise/CuesList";
import { MUSCLE_LABELS, type MuscleGroup, type AnatomyView } from "@/lib/data/muscle-groups";
import type { AnatomyGender } from "@/lib/data/anatomy/paths";
import type { ExercisePhase } from "@/lib/data/exercises";

type Props = {
  name: string;
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  tertiary: MuscleGroup[];
  phases: ExercisePhase[];
  demoAssetUrl: string | null;
  defaultView: AnatomyView;
  cues: string[];
};

const TIER_COLOR = {
  primary: "var(--fg)",
  secondary: "var(--anatomy-accent)",
  tertiary: "color-mix(in oklab, var(--anatomy-accent) 40%, transparent)",
} as const;

/**
 * Hero block on the exercise detail page. With a 3D loop, the loop is
 * the hero: full width like the landing's form-check card, cues and
 * muscles below, the cue list following the video's phases. Without
 * one, the drawn figure (phase-animated or static, picked by
 * ExerciseDemo) sits beside the cues with its view and gender toggles.
 */
export default function ExerciseHero({
  name,
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
  // Active phase index drives the cue list highlight. The 3D loop and
  // the PhaseAnimator both report it; the static figure leaves it null
  // (no rep cycle to sync against).
  const [activePhaseIdx, setActivePhaseIdx] = useState<number | null>(null);
  // Stable identity so PhaseAnimator's onPhaseChange-effect doesn't
  // re-fire on every render of this component.
  const handlePhaseChange = useCallback((idx: number) => setActivePhaseIdx(idx), []);
  const t = useTranslations("Train.hero");

  const details = (
    <>
      <div>
        <h2 className="eyebrow mb-4">{t("howTo")}</h2>
        <CuesList cues={cues} phases={phases} activePhaseIdx={activePhaseIdx} />
      </div>
      <MuscleChips primary={primary} secondary={secondary} tertiary={tertiary} title={t("musclesInvolved")} />
    </>
  );

  if (demoAssetUrl) {
    return (
      <div className="space-y-8 md:space-y-10">
        <ExerciseLoop
          url={demoAssetUrl}
          phases={phases}
          label={t("demoAria", { lift: name })}
          playLabel={t("demoPlay")}
          pauseLabel={t("demoPause")}
          onPhaseChange={handlePhaseChange}
        />
        <div className="grid gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-12 items-start">{details}</div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-[auto_1fr] md:gap-12 items-start">
      {/* Demo column */}
      <div className="flex flex-col items-center gap-4">
        <div className="surface-2 rounded-2xl p-6 lg:p-8">
          <ExerciseDemo
            demoAssetUrl={null}
            phases={phases}
            primary={primary}
            secondary={secondary}
            tertiary={tertiary}
            view={view}
            gender={gender}
            onPhaseChange={handlePhaseChange}
          />
        </div>

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

        <div className="flex items-center gap-4 text-micro text-fg-faint">
          <Dot color={TIER_COLOR.primary} label={t("tierPrimary")} />
          <Dot color={TIER_COLOR.secondary} label={t("tierSecondary")} />
          <Dot color={TIER_COLOR.tertiary} label={t("tierTertiary")} />
        </div>
      </div>

      {/* Cues column */}
      <div className="space-y-6">{details}</div>
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
          className={`flex-1 px-3 py-2 rounded-md text-xs ${
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
      <span className="size-2 rounded-full" style={{ background: color }} aria-hidden />
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
      <h2 className="eyebrow">{title}</h2>
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

function Chip({ label, color, dark = false }: { label: string; color: string; dark?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs"
      style={{
        background: color,
        color: dark ? "var(--bg)" : "var(--fg)",
      }}
    >
      {label}
    </span>
  );
}
