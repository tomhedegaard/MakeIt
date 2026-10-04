import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import AnatomyFigure from "@/components/anatomy/AnatomyFigure";
import type { Exercise, Session } from "@/lib/workout";
import { PrimaryMuscleTags, StatCell, dominantView } from "./session-parts";
import { startSessionAction } from "./actions";
import { ChevronLeft } from "lucide-react";
import { ICON } from "@/components/ui/icon";

/**
 * Read-only session view shown when status === "scheduled". Members
 * land here from the dashboard's "Upcoming" list or the week strip,
 * so they can browse what's coming without flipping the session to
 * active or kicking off logging UI. The "Start session" form-action
 * promotes the session to active and revalidates the route, after
 * which SessionClient takes over.
 */
export default async function SessionPreview({ session }: { session: Session }) {
  const t = await getTranslations("Session");

  const totalSets = session.exercises.reduce((a, e) => a + e.sets.length, 0);

  async function start() {
    "use server";
    await startSessionAction(session.id);
    redirect(`/session/${session.id}`);
  }

  return (
    <div className="min-h-dvh flex flex-col bg-bg">
      <header className="safe-top sticky top-0 z-30 bg-bg border-b hairline">
        <div className="px-4 lg:px-6 h-14 flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            aria-label={t("preview.back")}
            className="size-11 surface-2 flex items-center justify-center"
          >
            <ChevronLeft {...ICON} className="size-5" />
          </Link>

          <div className="flex-1 min-w-0 text-center">
            <div className="text-micro text-fg-faint">
              {t("topBar.programLine", {
                programCode: session.programCode,
                week: session.week,
                dayLabel: session.dayLabel,
              })}
            </div>
            <div className="numeric text-micro text-fg-dim">
              {t("preview.summary", {
                exerciseCount: session.exercises.length,
                setCount: totalSets,
              })}
            </div>
          </div>

          <div className="size-11" aria-hidden />
        </div>
      </header>

      <main className="flex-1 flex flex-col">
      <Container size="narrow" className="flex-1 py-6 pb-40 lg:pb-12 space-y-6">
        <section className="surface-2 p-5 lg:p-7">
          <div className="eyebrow mb-2">{t("preview.eyebrow")}</div>
          <h1 className="font-display text-title mb-2">
            {session.dayLabel}
          </h1>
          <p className="text-fg-dim text-meta md:text-copy leading-relaxed">
            {session.title}
          </p>
          <div className="grid grid-cols-3 gap-px bg-line border hairline overflow-hidden mt-5">
            <StatCell label={t("preview.exercises")} value={session.exercises.length} />
            <StatCell label={t("preview.sets")} value={totalSets} />
            <StatCell
              label={t("preview.estTime")}
              value={session.estimatedMinutes}
              suffix={t("units.minutes")}
            />
          </div>
        </section>

        {session.exercises.map((ex, i) => (
          <PreviewExercise
            key={ex.id}
            ex={ex}
            exIdx={i}
            totalExercises={session.exercises.length}
          />
        ))}
      </Container>
      </main>

      <div
        className="fixed bottom-0 left-0 right-0 z-30 bg-bg border-t hairline px-4 pt-3 lg:static lg:bg-transparent lg:border-t-0 lg:p-0"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <Container size="narrow" className="lg:pb-12">
          <form action={start}>
            <button type="submit" className="btn btn-primary btn-xl w-full">
              {t("preview.start")}
            </button>
          </form>
        </Container>
      </div>
    </div>
  );
}


async function PreviewExercise({
  ex,
  exIdx,
  totalExercises,
}: {
  ex: Exercise;
  exIdx: number;
  totalExercises: number;
}) {
  const t = await getTranslations("Session");
  const lib = ex.library;
  const figureView = lib ? dominantView(lib) : "front";
  const inlineCues = lib?.cues.slice(0, 3) ?? [];

  return (
    <section className="surface-2 p-5 lg:p-7">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0 flex-1">
          <div className="eyebrow mb-1">
            {t("exercise.position", { current: exIdx + 1, total: totalExercises })}
          </div>
          {lib ? (
            <Link
              href={`/train/exercises/${lib.slug}`}
              className="font-display text-section hover:text-fg-dim transition-colors"
            >
              {ex.name}
            </Link>
          ) : (
            <h2 className="font-display text-section">
              {ex.name}
            </h2>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="numeric text-section lg:text-title">{ex.sets.length}</div>
          <div className="eyebrow">{t("exercise.sets")}</div>
        </div>
      </div>

      {lib ? (
        <div className="flex gap-4 border-t hairline pt-4">
          <Link
            href={`/train/exercises/${lib.slug}`}
            className="shrink-0 lift surface p-1.5"
            aria-label={t("exercise.openDetails")}
          >
            <AnatomyFigure
              view={figureView}
              primary={lib.primaryMuscles}
              secondary={lib.secondaryMuscles}
              tertiary={lib.tertiaryMuscles}
              style={{ width: 56, height: 112 }}
            />
          </Link>

          <div className="min-w-0 flex-1 space-y-3">
            {inlineCues.length > 0 ? (
              <ol className="space-y-1.5">
                {inlineCues.map((cue, i) => (
                  <li key={i} className="flex gap-2 text-copy leading-snug">
                    <span className="text-fg-faint shrink-0 text-micro mt-0.5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{cue}</span>
                  </li>
                ))}
              </ol>
            ) : null}
            <PrimaryMuscleTags muscles={lib.primaryMuscles} />
          </div>
        </div>
      ) : ex.cue ? (
        <p className="text-meta text-fg-dim leading-relaxed border-t hairline pt-4">
          {ex.cue}
        </p>
      ) : null}

      <ul className="mt-5 divide-y hairline border-t hairline">
        {ex.sets.map((s, i) => (
          <li
            key={s.id}
            className="py-2.5 flex items-center gap-4 text-copy"
          >
            <span className="numeric text-fg-faint text-micro w-6">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex-1 numeric">
              {formatSetTarget(s.targetReps, s.targetWeight, s.targetRpe, {
                reps: t("units.reps"),
                kg: t("units.kg"),
              })}
            </span>
            {s.restSec && s.restSec > 0 ? (
              <span className="numeric text-fg-faint text-micro shrink-0">
                {s.restSec}s
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}


function formatSetTarget(
  reps: number,
  weight: number,
  rpe: number | undefined,
  unit: { reps: string; kg: string },
): string {
  const parts: string[] = [];
  if (reps > 0) parts.push(`${reps} ${unit.reps}`);
  if (weight > 0) parts.push(`${weight} ${unit.kg}`);
  if (rpe) parts.push(`RPE ${rpe}`);
  return parts.length > 0 ? parts.join(" · ") : "-";
}

