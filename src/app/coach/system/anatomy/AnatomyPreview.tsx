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
  type MuscleTier,
} from "@/lib/data/muscle-groups";
import type { AnatomyGender } from "@/lib/data/anatomy/paths";

/**
 * Sandbox for AnatomyFigure. Pick a lift → auto-fills muscle tiers
 * and picks the dominant view. Toggle gender + view + per-muscle
 * tier overrides to inspect the figure in every state.
 *
 * The lift catalogue here mirrors how the production exercise page
 * will call AnatomyFigure — primary lights the working muscles,
 * secondary the synergists, tertiary the stabilizers.
 */

type Exercise = {
  name: string;
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  tertiary: MuscleGroup[];
};

const LIFTS: Exercise[] = [
  {
    name: "Back Squat",
    primary: ["quads", "glutes"],
    secondary: ["hamstrings", "lower_back"],
    tertiary: ["abs", "adductors", "calves_back"],
  },
  {
    name: "Conventional Deadlift",
    primary: ["hamstrings", "glutes", "lower_back"],
    secondary: ["lats", "traps", "quads"],
    tertiary: ["forearms", "abs"],
  },
  {
    name: "Bench Press",
    primary: ["chest", "front_delts", "triceps"],
    secondary: ["forearms"],
    tertiary: ["abs"],
  },
  {
    name: "Overhead Press",
    primary: ["front_delts", "triceps"],
    secondary: ["chest", "traps"],
    tertiary: ["abs", "forearms"],
  },
  {
    name: "Barbell Row",
    primary: ["lats", "rear_delts"],
    secondary: ["biceps", "traps"],
    tertiary: ["forearms", "lower_back"],
  },
  {
    name: "Pull-up",
    primary: ["lats", "biceps"],
    secondary: ["rear_delts", "forearms"],
    tertiary: ["abs"],
  },
  {
    name: "Bicep Curl",
    primary: ["biceps"],
    secondary: ["forearms"],
    tertiary: [],
  },
  {
    name: "Tricep Pushdown",
    primary: ["triceps"],
    secondary: ["forearms"],
    tertiary: [],
  },
];

const TIER_DOT: Record<MuscleTier, string> = {
  primary: "#F5F2EC",
  secondary: "#C97B3E",
  tertiary: "#C97B3E66",
};

export default function AnatomyPreview() {
  const [selected, setSelected] = useState<Exercise | null>(LIFTS[0]);
  const [view, setView] = useState<AnatomyView>(
    viewForMuscles([...LIFTS[0].primary, ...LIFTS[0].secondary]),
  );
  const [gender, setGender] = useState<AnatomyGender>("male");
  const [overrides, setOverrides] = useState<
    Record<MuscleTier, Set<MuscleGroup>>
  >({
    primary: new Set(),
    secondary: new Set(),
    tertiary: new Set(),
  });

  function pickExercise(ex: Exercise) {
    setSelected(ex);
    setOverrides({
      primary: new Set(),
      secondary: new Set(),
      tertiary: new Set(),
    });
    setView(viewForMuscles([...ex.primary, ...ex.secondary]));
  }

  function toggleMuscle(m: MuscleGroup, tier: MuscleTier) {
    setOverrides((prev) => {
      const next: Record<MuscleTier, Set<MuscleGroup>> = {
        primary: new Set(prev.primary),
        secondary: new Set(prev.secondary),
        tertiary: new Set(prev.tertiary),
      };
      // Setting a tier removes from the other two; toggling re-clears.
      const wasOn = next[tier].has(m);
      next.primary.delete(m);
      next.secondary.delete(m);
      next.tertiary.delete(m);
      if (!wasOn) next[tier].add(m);
      return next;
    });
  }

  const tiered = useMemo(() => {
    const merge = (
      base: MuscleGroup[],
      override: Set<MuscleGroup>,
      excludeFrom: Set<MuscleGroup>[] = [],
    ) => {
      const merged = new Set([...base, ...override]);
      for (const ex of excludeFrom) for (const m of ex) merged.delete(m);
      return Array.from(merged);
    };

    const overridden = new Set([
      ...overrides.primary,
      ...overrides.secondary,
      ...overrides.tertiary,
    ]);
    const baseMinusOverrides = (arr: MuscleGroup[]) =>
      arr.filter((m) => !overridden.has(m));

    return {
      primary: merge(baseMinusOverrides(selected?.primary ?? []), overrides.primary),
      secondary: merge(baseMinusOverrides(selected?.secondary ?? []), overrides.secondary),
      tertiary: merge(baseMinusOverrides(selected?.tertiary ?? []), overrides.tertiary),
    };
  }, [selected, overrides]);

  // Show muscles relevant for the current view in the right panel
  const visibleMuscles =
    view === "front"
      ? Array.from(new Set([...FRONT_MUSCLES, "forearms", "traps", "triceps", "calves_back"] as MuscleGroup[]))
      : Array.from(new Set([...BACK_MUSCLES, "forearms", "calves_back", "adductors"] as MuscleGroup[]));

  function tierOf(m: MuscleGroup): MuscleTier | null {
    if (tiered.primary.includes(m)) return "primary";
    if (tiered.secondary.includes(m)) return "secondary";
    if (tiered.tertiary.includes(m)) return "tertiary";
    return null;
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_auto_1fr] items-start">
      {/* Left: exercise picker + gender/view */}
      <section className="space-y-5">
        <div>
          <div className="eyebrow mb-2">Øvelse</div>
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
                    {ex.primary.length}P · {ex.secondary.length}S · {ex.tertiary.length}T
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t hairline pt-4">
          <div className="eyebrow mb-2">Køn</div>
          <div className="flex gap-1">
            {(["male", "female"] as AnatomyGender[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`flex-1 px-3 py-2 rounded-md text-xs font-mono uppercase tracking-[0.14em] ${
                  gender === g ? "bg-bg-3 text-fg" : "text-fg-dim hover:text-fg"
                }`}
              >
                {g === "male" ? "Mand" : "Kvinde"}
              </button>
            ))}
          </div>
        </div>

        <div>
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
            gender={gender}
            primary={tiered.primary}
            secondary={tiered.secondary}
            tertiary={tiered.tertiary}
            style={{ width: 260, height: 520 }}
          />
        </div>
        <div className="mt-3 flex items-center gap-4 text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ background: TIER_DOT.primary }}
            />{" "}
            Primær
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ background: TIER_DOT.secondary }}
            />{" "}
            Sekundær
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ background: TIER_DOT.tertiary }}
            />{" "}
            Tertiær
          </span>
        </div>
      </div>

      {/* Right: muscle toggles */}
      <section className="space-y-4">
        <div>
          <div className="eyebrow mb-2">
            Synlige muskler · {view === "front" ? "forfra" : "bagfra"}
          </div>
          <ul className="grid gap-1.5">
            {visibleMuscles.map((m) => {
              const t = tierOf(m);
              return (
                <li
                  key={m}
                  className="flex items-center gap-2 text-sm py-1"
                >
                  <span
                    className="size-3 rounded-full shrink-0"
                    style={{
                      background: t ? TIER_DOT[t] : "#2a2a2e",
                    }}
                    aria-hidden
                  />
                  <span className="flex-1">{MUSCLE_LABELS[m]}</span>
                  {(["primary", "secondary", "tertiary"] as MuscleTier[]).map(
                    (tier) => {
                      const isOn = t === tier;
                      const label = tier === "primary" ? "P" : tier === "secondary" ? "S" : "T";
                      return (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => toggleMuscle(m, tier)}
                          className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.14em] rounded border hairline ${
                            isOn
                              ? "border-transparent"
                              : "text-fg-dim hover:text-fg"
                          }`}
                          style={
                            isOn
                              ? {
                                  background: TIER_DOT[tier],
                                  color: tier === "primary" ? "#000" : "#000",
                                }
                              : undefined
                          }
                        >
                          {label}
                        </button>
                      );
                    },
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t hairline pt-3 text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
          <div>Active selection</div>
          <div className="mt-2 text-fg-dim font-mono normal-case tracking-normal text-xs">
            <code className="text-fg">primary</code>: [{tiered.primary.join(", ") || "—"}]
          </div>
          <div className="mt-1 text-fg-dim font-mono normal-case tracking-normal text-xs">
            <code className="text-fg">secondary</code>: [{tiered.secondary.join(", ") || "—"}]
          </div>
          <div className="mt-1 text-fg-dim font-mono normal-case tracking-normal text-xs">
            <code className="text-fg">tertiary</code>: [{tiered.tertiary.join(", ") || "—"}]
          </div>
        </div>
      </section>
    </div>
  );
}
