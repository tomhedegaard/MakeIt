"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { groupByCategory } from "@/lib/data/exercise-taxonomy";

export type PickerExercise = { id: string; name: string; category: string | null };

/**
 * The exercise dropdown in the program builder. With several hundred
 * exercises a flat list is unusable, so the options are grouped by
 * category in taxonomy order and sorted by name inside each group.
 */
export default function ExercisePicker({
  value,
  library,
  onChange,
  emptyLabel,
  uncategorisedLabel,
}: {
  value: string | null;
  library: PickerExercise[];
  onChange: (exercise: PickerExercise | null) => void;
  emptyLabel: string;
  uncategorisedLabel: string;
}) {
  const tTrain = useTranslations("Train");
  const groups = useMemo(() => groupByCategory(library), [library]);
  const groupLabel = (category: string | null) =>
    category === null
      ? uncategorisedLabel
      : tTrain.has(`categories.${category}`)
        ? tTrain(`categories.${category}`)
        : category;

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(library.find((l) => l.id === e.target.value) ?? null)}
      className="input w-full"
    >
      {library.length === 0 ? <option value="">{emptyLabel}</option> : null}
      {groups.map((group) => (
        <optgroup key={group.category ?? ""} label={groupLabel(group.category)}>
          {group.items.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
