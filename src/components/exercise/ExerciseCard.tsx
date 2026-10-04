import Link from "next/link";
import { getTranslations } from "next-intl/server";
import AnatomyFigure from "@/components/anatomy/AnatomyFigure";
import { MUSCLE_LABELS } from "@/lib/data/muscle-groups";
import { dominantView, type Exercise } from "@/lib/data/exercises";
import { exerciseMetaLabels } from "@/lib/data/exercise-meta";

/**
 * Index-card view of an exercise. Figure thumbnail on the left,
 * name + meta + first cue on the right. Used by /train/exercises.
 *
 * Compact variant is used inline in workouts and program sheets —
 * just figure + name + primary muscles, no cue line.
 */
export default async function ExerciseCard({
  exercise,
  compact = false,
}: {
  exercise: Exercise;
  compact?: boolean;
}) {
  const t = await getTranslations("Train.card");
  const tTrain = await getTranslations("Train");
  const view = dominantView(exercise);
  const href = `/train/exercises/${exercise.slug}`;
  const primaryNames = exercise.primaryMuscles
    .map((m) => MUSCLE_LABELS[m])
    .join(" · ");

  if (compact) {
    return (
      <Link
        href={href}
        className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-bg-3/60 transition-colors"
      >
        <div className="shrink-0 surface-2 rounded-md p-1">
          <AnatomyFigure
            view={view}
            primary={exercise.primaryMuscles}
            secondary={exercise.secondaryMuscles}
            tertiary={exercise.tertiaryMuscles}
            style={{ width: 28, height: 56 }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-copy truncate">{exercise.name}</div>
          <div className="text-micro text-fg-faint truncate">
            {primaryNames || t("metaEmpty")}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="surface-2 lift block min-w-0 overflow-hidden"
    >
      <div className="flex gap-4 p-4 sm:p-5">
        <div className="shrink-0 surface-2 rounded-lg p-2">
          <AnatomyFigure
            view={view}
            primary={exercise.primaryMuscles}
            secondary={exercise.secondaryMuscles}
            tertiary={exercise.tertiaryMuscles}
            style={{ width: 60, height: 120 }}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <div className="font-display text-card sm:text-section truncate">
              {exercise.name}
            </div>
            <div className="eyebrow eyebrow-domain mt-1 truncate" data-domain="body">
              {exerciseMetaLabels(tTrain, exercise).join(" · ")}
            </div>
          </div>

          {primaryNames ? (
            <div className="text-micro text-fg-dim truncate">
              <span className="text-fg-faint">{t("primaryPrefix")}</span>
              {primaryNames}
            </div>
          ) : null}

          {exercise.cues[0] ? (
            <p className="text-meta text-fg-dim line-clamp-2">
              {exercise.cues[0]}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
