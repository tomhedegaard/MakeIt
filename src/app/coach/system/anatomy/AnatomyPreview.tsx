"use client";

import { useMemo, useState } from "react";
import AnatomyFigure from "@/components/anatomy/AnatomyFigure";
import {
  MUSCLE_LABELS,
  FRONT_MUSCLES,
  BACK_MUSCLES,
  viewForMuscles,
  type AnatomyView,
  type MuscleGroup,
} from "@/lib/data/muscle-groups";

/**
 * Sandbox for the AnatomyFigure component. Lets the iterator toggle
 * any muscle as primary or secondary and switch views, so we can
 * visually verify positioning + highlight colors before wiring the
 * figure to real exercises.
 *
 * Also ships a small library of common lifts with pre-populated
 * muscle mappings — clicking one auto-fills the toggles + picks the
 * dominant view, mimicking how the production exercise page will
 * call AnatomyFigure.
 */

type Exercise = {
  name: string;
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
};

const LIFTS: Exercise[] = [
  {
    name: "Back Squat",
    primary: ["quads", "glutes"],
    secondary: ["hamstrings", "abs", "lower_back", "calves_back"],
  },
  {
    name: "Conventional Deadlift",
    primary: ["hamstrings", "glutes", "lower_back"],
    secondary: ["lats", "traps", "forearms", "quads"],
  },
  {
    name: "Bench Press",
    primary: ["chest", "front_delts", "triceps"],
    secondary: ["forearms"],
  },
  {
    name: "Overhead Press",
    primary: ["front_delts", "triceps"],
    secondary: ["chest", "abs", "traps"],
  },
  {
    name: "Barbell Row",
    primary: ["lats", "rear_delts"],
    secondary: ["biceps", "forearms", "lower_back", "traps"],
  },
  {
    name: "Pull-up",
    primary: ["lats", "biceps"],
    secondary: ["rear_delts", "forearms", "abs"],
  },
  {
    name: "Bicep Curl",
    primary: ["biceps"],
    secondary: ["forearms"],
  },
  {
    name: "Tricep Pushdown",
    primary: ["triceps"],
    secondary: ["forearms"],
  },
];

export default function AnatomyPreview() {
  const [selected, setSelected] = useState<Exercise | null>(LIFTS[0]);
  const [view, setView] = useState<AnatomyView>("front");
  const [extraPrimary, setExtraPrimary] = useState<Set<MuscleGroup>>(new Set());
  const [extraSecondary, setExtraSecondary] = useState<Set<MuscleGroup>>(new Set());

  function pickExercise(ex: Exercise) {
    setSelected(ex);
    setExtraPrimary(new Set());
    setExtraSecondary(new Set());
    setView(viewForMuscles([...ex.primary, ...ex.secondary]));
  }

  function toggleMuscle(m: MuscleGroup, tier: "primary" | "secondary") {
    const setOps = (
      s: Set<MuscleGroup>,
      setter: (next: Set<MuscleGroup>) => void,
    ) => {
      const next = new Set(s);
      next.has(m) ? next.delete(m) : next.add(m);
      setter(next);
    };
    if (tier === "primary") setOps(extraPrimary, setExtraPrimary);
    else setOps(extraSecondary, setExtraSecondary);
  }

  const primary = useMemo<MuscleGroup[]>(() => {
    const base = selected?.primary ?? [];
    return Array.from(new Set([...base, ...extraPrimary]));
  }, [selected, extraPrimary]);

  const secondary = useMemo<MuscleGroup[]>(() => {
    const base = selected?.secondary ?? [];
    return Array.from(new Set([...base, ...extraSecondary]));
  }, [selected, extraSecondary]);

  const visibleMuscles = view === "front" ? FRONT_MUSCLES : BACK_MUSCLES;

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_auto_1fr] items-start">
      {/* Left: exercise picker */}
      <section className="space-y-3">
        <div className="eyebrow">Øvelse</div>
        <ul className="grid gap-1">
          {LIFTS.map((ex) => (
            <li key={ex.name}>
              <button
                type="button"
                onClick={() => pickExercise(ex)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  selected?.name === ex.name
                    ? "bg-bg-3 text-fg"
                    : "text-fg-dim hover:bg-bg-3/60 hover:text-fg"
                }`}
              >
                <div className="font-display">{ex.name}</div>
                <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint mt-0.5">
                  {ex.primary.length}P · {ex.secondary.length}S
                </div>
              </button>
            </li>
          ))}
        </ul>

        <div className="border-t hairline pt-4">
          <div className="eyebrow mb-2">View</div>
          <div className="flex gap-1">
            {(["front", "back"] as AnatomyView[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`flex-1 px-3 py-2 rounded-md text-xs font-mono uppercase tracking-[0.14em] ${
                  view === v ? "bg-bg-3 text-fg" : "text-fg-dim hover:text-fg"
                }`}
              >
                {v === "front" ? "Forfra" : "Bagfra"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Middle: the figure itself */}
      <div className="flex flex-col items-center justify-self-center">
        <div className="surface-2 rounded-2xl p-6 lg:p-8">
          <AnatomyFigure
            view={view}
            primary={primary}
            secondary={secondary}
            style={{ width: 240, height: 640 }}
          />
        </div>
        <div className="mt-3 flex items-center gap-4 text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#F5F2EC]" /> Primær
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#C97B3E]" /> Sekundær
          </span>
        </div>
      </div>

      {/* Right: muscle toggles to add/remove on top of selected exercise */}
      <section className="space-y-4">
        <div>
          <div className="eyebrow mb-2">Synlige muskler · {view === "front" ? "forfra" : "bagfra"}</div>
          <ul className="grid gap-1.5">
            {visibleMuscles.map((m) => {
              const isPrimary = primary.includes(m);
              const isSecondary = secondary.includes(m);
              return (
                <li
                  key={m}
                  className="flex items-center gap-2 text-sm py-1"
                >
                  <span
                    className="size-3 rounded-full shrink-0"
                    style={{
                      background: isPrimary
                        ? "#F5F2EC"
                        : isSecondary
                        ? "#C97B3E"
                        : "#2a2a2e",
                    }}
                    aria-hidden
                  />
                  <span className="flex-1">{MUSCLE_LABELS[m]}</span>
                  <button
                    type="button"
                    onClick={() => toggleMuscle(m, "primary")}
                    className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.14em] rounded border hairline ${
                      isPrimary ? "bg-fg text-bg" : "text-fg-dim hover:text-fg"
                    }`}
                  >
                    P
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleMuscle(m, "secondary")}
                    className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.14em] rounded border hairline ${
                      isSecondary
                        ? "bg-[#C97B3E] text-bg"
                        : "text-fg-dim hover:text-fg"
                    }`}
                  >
                    S
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t hairline pt-3 text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
          <div>Active selection</div>
          <div className="mt-2 text-fg-dim font-mono normal-case tracking-normal text-xs">
            <code className="text-fg">primary</code>: [{primary.join(", ") || "—"}]
          </div>
          <div className="mt-1 text-fg-dim font-mono normal-case tracking-normal text-xs">
            <code className="text-fg">secondary</code>: [{secondary.join(", ") || "—"}]
          </div>
        </div>
      </section>
    </div>
  );
}
