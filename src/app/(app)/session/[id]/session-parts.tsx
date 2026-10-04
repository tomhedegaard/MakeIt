import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/data/muscle-groups";
import type { ExerciseLibrary } from "@/lib/workout";

/** Shared by the live session (client) and the preview (server). */

export function PrimaryMuscleTags({ muscles }: { muscles: MuscleGroup[] }) {
  if (muscles.length === 0) return null;
  return (
    <div className="flex gap-1 flex-wrap">
      {muscles.map((m) => (
        <span key={m} className="px-2 py-0.5 text-micro bg-bg-3 text-fg-dim">
          {MUSCLE_LABELS[m]}
        </span>
      ))}
    </div>
  );
}

const FRONT = new Set([
  "neck", "chest", "front_delts", "biceps", "forearms", "abs",
  "obliques", "adductors", "quads", "calves_front",
]);

export function dominantView(lib: ExerciseLibrary): "front" | "back" {
  let front = 0;
  let back = 0;
  for (const m of [...lib.primaryMuscles, ...lib.secondaryMuscles]) {
    if (FRONT.has(m)) front++;
    else back++;
  }
  return back >= front ? "back" : "front";
}

/** One cell in a 1 px-gapped stat row. */
export function StatCell({
  label,
  value,
  suffix,
}: {
  label: string;
  value: React.ReactNode;
  suffix?: string;
}) {
  return (
    <div className="bg-bg-2 px-3 py-3 text-center">
      <div className="eyebrow mb-1">{label}</div>
      <div className="numeric text-2xl">
        {value}
        {suffix ? <span className="text-fg-dim text-sm ml-1">{suffix}</span> : null}
      </div>
    </div>
  );
}
