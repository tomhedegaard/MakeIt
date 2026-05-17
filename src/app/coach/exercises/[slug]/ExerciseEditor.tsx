"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Exercise, ExercisePhase } from "@/lib/data/exercises";
import type { MuscleGroup, AnatomyView } from "@/lib/data/muscle-groups";
import AnatomyFigure from "@/components/anatomy/AnatomyFigure";
import MuscleTierPicker, {
  type MuscleTiers,
} from "@/components/coach/MuscleTierPicker";
import { saveExerciseAction } from "@/app/coach/exercises/actions";

const CATEGORIES = [
  "lower-body",
  "upper-body-push",
  "upper-body-pull",
  "full-body",
  "shoulders",
  "arms",
  "core",
];
const PATTERNS = [
  "squat",
  "hinge",
  "push-horizontal",
  "push-vertical",
  "pull-horizontal",
  "pull-vertical",
  "lunge",
  "core",
];
const EQUIPMENT = ["barbell", "dumbbell", "bodyweight", "machine", "cable"];
const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

type DraftMistake = { title: string; body: string };
type DraftPhase = {
  name: string;
  duration_ms: number;
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  tertiary: MuscleGroup[];
};

export default function ExerciseEditor({ exercise }: { exercise: Exercise }) {
  const [name, setName] = useState(exercise.name);
  const [category, setCategory] = useState(exercise.category ?? "");
  const [pattern, setPattern] = useState(exercise.pattern ?? "");
  const [equipment, setEquipment] = useState(exercise.equipment ?? "");
  const [difficulty, setDifficulty] = useState<string>(
    exercise.difficulty ?? "",
  );
  const [displayOrder, setDisplayOrder] = useState(exercise.displayOrder);
  const [demoAssetUrl, setDemoAssetUrl] = useState(exercise.demoAssetUrl ?? "");
  const [isPublished, setIsPublished] = useState(exercise.isPublished);

  const [tiers, setTiers] = useState<MuscleTiers>({
    primary: exercise.primaryMuscles,
    secondary: exercise.secondaryMuscles,
    tertiary: exercise.tertiaryMuscles,
  });

  const [cues, setCues] = useState<string[]>(exercise.cues);
  const [mistakes, setMistakes] = useState<DraftMistake[]>(exercise.mistakes);
  const [whyMatters, setWhyMatters] = useState(exercise.whyMatters ?? "");
  const [setup, setSetup] = useState(exercise.setup ?? "");
  const [progression, setProgression] = useState(exercise.progression ?? "");
  const [regression, setRegression] = useState(exercise.regression ?? "");
  const [phases, setPhases] = useState<DraftPhase[]>(
    exercise.phases.map((p) => ({ ...p })),
  );

  const [view, setView] = useState<AnatomyView>("front");
  const [saving, startSave] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startSave(async () => {
      const res = await saveExerciseAction({
        id: exercise.id,
        slug: exercise.slug,
        name,
        category: category || null,
        pattern: pattern || null,
        equipment: equipment || null,
        difficulty:
          difficulty === "beginner" ||
          difficulty === "intermediate" ||
          difficulty === "advanced"
            ? difficulty
            : null,
        primaryMuscles: tiers.primary,
        secondaryMuscles: tiers.secondary,
        tertiaryMuscles: tiers.tertiary,
        cues: cues.map((c) => c.trim()).filter(Boolean),
        mistakes: mistakes.filter((m) => m.title.trim()),
        whyMatters: whyMatters.trim() || null,
        setup: setup.trim() || null,
        progression: progression.trim() || null,
        regression: regression.trim() || null,
        demoAssetUrl: demoAssetUrl.trim() || null,
        displayOrder,
        isPublished,
        phases: phases.map(
          (p): ExercisePhase => ({
            name: p.name,
            duration_ms: p.duration_ms,
            primary: p.primary,
            secondary: p.secondary,
            tertiary: p.tertiary,
          }),
        ),
      });
      if (res.ok) setSavedAt(new Date().toLocaleTimeString("da-DK"));
      else setError(res.error ?? "Kunne ikke gemme");
    });
  }

  /* -------- phase mutations -------- */
  function patchPhase(pi: number, patch: Partial<DraftPhase>) {
    setPhases((prev) => prev.map((p, i) => (i === pi ? { ...p, ...patch } : p)));
  }
  function addPhase() {
    setPhases((prev) => [
      ...prev,
      { name: "Fase", duration_ms: 1000, primary: [], secondary: [], tertiary: [] },
    ]);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="pt-2">
        <div className="eyebrow mb-2 flex items-center gap-2">
          <Link href="/coach/exercises" className="hover:text-fg">
            Øvelser
          </Link>
          <span aria-hidden>·</span>
          <span className="numeric">{exercise.slug}</span>
        </div>
        <h1 className="font-display text-[clamp(2rem,5vw,3rem)] leading-[0.95]">
          {name || "Uden navn"}.
        </h1>
      </header>

      {/* Meta */}
      <section className="surface-2 rounded-xl p-5 md:p-6 space-y-4">
        <div className="eyebrow">Metadata</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Navn">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
              maxLength={80}
            />
          </Field>
          <Field label="Kategori">
            <Select value={category} onChange={setCategory} options={CATEGORIES} />
          </Field>
          <Field label="Bevægelsesmønster">
            <Select value={pattern} onChange={setPattern} options={PATTERNS} />
          </Field>
          <Field label="Udstyr">
            <Select value={equipment} onChange={setEquipment} options={EQUIPMENT} />
          </Field>
          <Field label="Sværhedsgrad">
            <Select
              value={difficulty}
              onChange={setDifficulty}
              options={[...DIFFICULTIES]}
            />
          </Field>
          <Field label="Rækkefølge (display_order)">
            <input
              type="number"
              value={displayOrder}
              onChange={(e) =>
                setDisplayOrder(parseInt(e.target.value, 10) || 0)
              }
              className="input w-full"
            />
          </Field>
          <Field label="Demo-asset URL (valgfri)">
            <input
              value={demoAssetUrl}
              onChange={(e) => setDemoAssetUrl(e.target.value)}
              placeholder="…/exercise-demos/slug.webm"
              className="input w-full"
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          <span>Publiceret — synlig på /train/exercises</span>
        </label>
      </section>

      {/* Muscle tiers + figure */}
      <section className="surface-2 rounded-xl p-5 md:p-6">
        <div className="eyebrow mb-4">Muskelgrupper</div>
        <div className="grid gap-6 md:grid-cols-[1fr_auto]">
          <MuscleTierPicker value={tiers} onChange={setTiers} />
          <div className="flex flex-col items-center gap-3 shrink-0">
            <div className="surface rounded-xl p-4">
              <AnatomyFigure
                view={view}
                primary={tiers.primary}
                secondary={tiers.secondary}
                tertiary={tiers.tertiary}
                style={{ width: 150, height: 300 }}
              />
            </div>
            <div className="flex gap-1">
              {(["front", "back"] as AnatomyView[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-[0.14em] ${
                    view === v ? "bg-bg-3 text-fg" : "text-fg-dim"
                  }`}
                >
                  {v === "front" ? "Forfra" : "Bagfra"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cues */}
      <section className="surface-2 rounded-xl p-5 md:p-6 space-y-3">
        <div className="eyebrow">Cues</div>
        {cues.map((c, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className="numeric text-xs text-fg-faint w-6">
              {String(i + 1).padStart(2, "0")}
            </span>
            <input
              value={c}
              onChange={(e) =>
                setCues((prev) =>
                  prev.map((x, j) => (j === i ? e.target.value : x)),
                )
              }
              className="input w-full"
            />
            <RemoveBtn
              onClick={() =>
                setCues((prev) => prev.filter((_, j) => j !== i))
              }
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setCues((prev) => [...prev, ""])}
          className="btn btn-ghost btn-sm"
        >
          + Cue
        </button>
      </section>

      {/* Mistakes */}
      <section className="surface-2 rounded-xl p-5 md:p-6 space-y-3">
        <div className="eyebrow">Typiske fejl</div>
        {mistakes.map((m, i) => (
          <div key={i} className="surface rounded-lg p-3 space-y-2">
            <div className="flex gap-2 items-center">
              <input
                value={m.title}
                placeholder="Fejl-titel"
                onChange={(e) =>
                  setMistakes((prev) =>
                    prev.map((x, j) =>
                      j === i ? { ...x, title: e.target.value } : x,
                    ),
                  )
                }
                className="input w-full"
              />
              <RemoveBtn
                onClick={() =>
                  setMistakes((prev) => prev.filter((_, j) => j !== i))
                }
              />
            </div>
            <textarea
              value={m.body}
              placeholder="Hvad sker der + hvordan retter man det"
              rows={2}
              onChange={(e) =>
                setMistakes((prev) =>
                  prev.map((x, j) =>
                    j === i ? { ...x, body: e.target.value } : x,
                  ),
                )
              }
              className="input w-full"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setMistakes((prev) => [...prev, { title: "", body: "" }])
          }
          className="btn btn-ghost btn-sm"
        >
          + Fejl
        </button>
      </section>

      {/* Text fields */}
      <section className="surface-2 rounded-xl p-5 md:p-6 grid gap-4 sm:grid-cols-2">
        <Field label="Hvorfor (why_matters)">
          <textarea
            value={whyMatters}
            onChange={(e) => setWhyMatters(e.target.value)}
            rows={3}
            className="input w-full"
          />
        </Field>
        <Field label="Setup">
          <textarea
            value={setup}
            onChange={(e) => setSetup(e.target.value)}
            rows={3}
            className="input w-full"
          />
        </Field>
        <Field label="Progression">
          <textarea
            value={progression}
            onChange={(e) => setProgression(e.target.value)}
            rows={2}
            className="input w-full"
          />
        </Field>
        <Field label="Regression">
          <textarea
            value={regression}
            onChange={(e) => setRegression(e.target.value)}
            rows={2}
            className="input w-full"
          />
        </Field>
      </section>

      {/* Phases */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="eyebrow">Bevægelsesfaser</div>
          <button type="button" onClick={addPhase} className="btn btn-sm">
            + Tilføj fase
          </button>
        </div>
        {phases.length === 0 ? (
          <p className="text-fg-dim text-sm">
            Ingen faser — figuren viser de statiske muskelgrupper i stedet.
          </p>
        ) : (
          phases.map((phase, pi) => (
            <article key={pi} className="surface-2 rounded-xl p-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
                <Field label="Fase-navn">
                  <input
                    value={phase.name}
                    onChange={(e) => patchPhase(pi, { name: e.target.value })}
                    className="input w-full"
                  />
                </Field>
                <Field label="Varighed (ms)">
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={phase.duration_ms}
                    onChange={(e) =>
                      patchPhase(pi, {
                        duration_ms: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="input w-full"
                  />
                </Field>
                <button
                  type="button"
                  onClick={() =>
                    setPhases((prev) => prev.filter((_, j) => j !== pi))
                  }
                  className="btn btn-ghost btn-sm"
                >
                  Slet fase
                </button>
              </div>
              <div className="grid gap-6 md:grid-cols-[1fr_auto] border-t hairline pt-4">
                <MuscleTierPicker
                  value={{
                    primary: phase.primary,
                    secondary: phase.secondary,
                    tertiary: phase.tertiary,
                  }}
                  onChange={(next) => patchPhase(pi, next)}
                />
                <div className="surface rounded-xl p-3 shrink-0 self-start">
                  <AnatomyFigure
                    view={view}
                    primary={phase.primary}
                    secondary={phase.secondary}
                    tertiary={phase.tertiary}
                    style={{ width: 110, height: 220 }}
                  />
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      {/* Save bar */}
      <section className="surface-2 rounded-xl p-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? "Gemmer…" : "Gem øvelse"}
        </button>
        {savedAt ? (
          <span className="text-[11px] font-mono text-fg-faint">
            Gemt {savedAt}
          </span>
        ) : null}
        {error ? (
          <span className="text-sm" style={{ color: "#C97B3E" }}>
            {error}
          </span>
        ) : null}
        <Link
          href={`/train/exercises/${exercise.slug}`}
          className="btn btn-ghost btn-sm ml-auto"
        >
          Se på /train →
        </Link>
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * Small field helpers
 * ---------------------------------------------------------------- */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5 block">
      <span className="text-xs text-fg-dim">{label}</span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input w-full"
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-fg-dim hover:text-fg text-lg leading-none px-1.5 shrink-0"
      aria-label="Fjern"
    >
      ×
    </button>
  );
}
