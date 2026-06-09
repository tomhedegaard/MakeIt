"use client";

import { useState } from "react";
import AnatomyFigure3D from "./AnatomyFigure3D";
import AnatomyFigure from "./AnatomyFigure";
import type { AnatomyView, MuscleGroup } from "@/lib/data/muscle-groups";
import type { AnatomyGender } from "@/lib/data/anatomy/paths";

/**
 * Side-by-side comparison of the existing 2D <AnatomyFigure> and the
 * new 3D extruded variant. Same props go to both, so a coach can
 * eyeball whether the 3D model preserves the 2D's tier semantics and
 * silhouette across a few representative exercise muscle-sets.
 *
 * Lives at /coach/system/anatomy?spike=1.
 */

type Preset = {
  label: string;
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  tertiary: MuscleGroup[];
  initialView: AnatomyView;
};

const PRESETS: Preset[] = [
  {
    label: "Squat",
    primary: ["quads", "glutes"],
    secondary: ["hamstrings", "adductors", "lower_back"],
    tertiary: ["abs", "calves_back"],
    initialView: "front",
  },
  {
    label: "Deadlift",
    primary: ["glutes", "hamstrings", "lower_back"],
    secondary: ["lats", "traps", "quads"],
    tertiary: ["forearms", "abs"],
    initialView: "back",
  },
  {
    label: "Bench",
    primary: ["chest", "front_delts", "triceps"],
    secondary: ["lats"],
    tertiary: ["forearms"],
    initialView: "front",
  },
  {
    label: "Pull-up",
    primary: ["lats", "biceps"],
    secondary: ["rear_delts", "traps", "forearms"],
    tertiary: ["abs"],
    initialView: "back",
  },
  {
    label: "Ingen",
    primary: [],
    secondary: [],
    tertiary: [],
    initialView: "front",
  },
];

export default function AnatomyFigure3DSpike() {
  const [presetIdx, setPresetIdx] = useState(0);
  const [gender, setGender] = useState<AnatomyGender>("male");
  const [view, setView] = useState<AnatomyView>(PRESETS[0].initialView);

  const preset = PRESETS[presetIdx];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="space-y-3">
        <div className="eyebrow">Preset</div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setPresetIdx(i);
                setView(p.initialView);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-[0.14em] ${
                i === presetIdx ? "bg-bg-3 text-fg" : "surface-2 text-fg-dim"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="eyebrow">Gender</span>
            <div className="flex gap-1">
              {(["male", "female"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-[0.14em] ${
                    g === gender ? "bg-bg-3 text-fg" : "surface-2 text-fg-dim"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="eyebrow">View</span>
            <div className="flex gap-1">
              {(["front", "back"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-[0.14em] ${
                    v === view ? "bg-bg-3 text-fg" : "surface-2 text-fg-dim"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-side */}
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="2D (eksisterende)">
          <div className="flex justify-center surface-2 rounded-2xl p-6">
            <AnatomyFigure
              view={view}
              gender={gender}
              primary={preset.primary}
              secondary={preset.secondary}
              tertiary={preset.tertiary}
              style={{ width: 220, height: 440 }}
            />
          </div>
        </Panel>

        <Panel title="3D (ny, drag for at rotere)">
          <div
            className="surface-2 rounded-2xl overflow-hidden"
            style={{ width: "100%", aspectRatio: "1 / 1.4" }}
          >
            <AnatomyFigure3D
              // Remount when gender/view changes so the camera resets
              // to the new initialView — OrbitControls own the camera
              // position after first render.
              key={`${gender}:${view}`}
              gender={gender}
              primary={preset.primary}
              secondary={preset.secondary}
              tertiary={preset.tertiary}
              initialView={view}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </Panel>
      </div>

      <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint max-w-xl">
        Spike: 3D-figuren extruder de eksisterende 2D SVG-paths via THREE.ExtrudeGeometry.
        Front + back er to separate slabs ryg-mod-ryg, så når du orbiterer bagom ser
        du faktisk back-view&apos;ens musklayout — ikke bagsiden af front-extruderingen.
      </p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="eyebrow">{title}</div>
      {children}
    </div>
  );
}
