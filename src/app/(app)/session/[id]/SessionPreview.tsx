import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import AnatomyFigure from "@/components/anatomy/AnatomyFigure";
import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/data/muscle-groups";
import type { Exercise, ExerciseLibrary, Session } from "@/lib/workout";
import { startSessionAction } from "./actions";

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
    <div className="minh-dvh flex flex-col bg-bg">
      <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur border-b hairline">
        <div className="px-4 lg:px-6 h-14 flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            aria-label={t("preview.back")}
            className="size-10 rounded-full surface-2 flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
              <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>

          <div className="flex-1 min-w-0 text-center">
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-fg-faint">
              {t("topBar.programLine", {
                programCode: session.programCode,
                week: session.week,
                dayLabel: session.dayLabel,
              })}
            </div>
            <div className="numeric text-xs text-fg-dim">
              {t("preview.summary", {
                exerciseCount: session.exercises.length,
                setCount: totalSets,
              })}
            </div>
          </div>

          <div className="size-10" aria-hidden />
        </div>
      </header>

      <Container size="narrow" className="flex-1 py-6 pb-40 lg:pb-12 space-y-6">
        <section className="surface-2 rounded-2xl p-5 lg:p-7">
          <div className="eyebrow mb-2">{t("preview.eyebrow")}</div>
          <h1 className="font-display text-3xl lg:text-4xl leading-[1] mb-2">
            {session.dayLabel}
          </h1>
          <p className="text-fg-dim text-sm md:text-base leading-relaxed">
            {session.title}
          </p>
          <div className="grid grid-cols-3 gap-px bg-line border hairline rounded-lg overflow-hidden mt-5">
            <Stat label={t("preview.exercises")} value={session.exercises.length} />
            <Stat label={t("preview.sets")} value={totalSets} />
            <Stat
              label={t("preview.estTime")}
              value={session.estimatedMinutes}
              suffix="m"
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

      <div className="fixed bottom-0 left-0 right-0 z-30 bg-bg/95 backdrop-blur border-t hairline p-4 lg:static lg:bg-transparent lg:border-t-0 lg:p-0">
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

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | string;
  suffix?: string;
}) {
  return (
    <div className="bg-bg-2 px-4 py-3 text-center">
      <div className="eyebrow mb-1">{label}</div>
      <div className="numeric text-2xl">
        {value}
        {suffix ? <span className="text-fg-dim text-sm ml-0.5">{suffix}</span> : null}
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
    <section className="surface-2 rounded-2xl p-5 lg:p-7">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0 flex-1">
          <div className="eyebrow mb-1">
            {t("exercise.position", { current: exIdx + 1, total: totalExercises })}
          </div>
          {lib ? (
            <Link
              href={`/train/exercises/${lib.slug}`}
              className="font-display text-2xl lg:text-3xl leading-[1.05] hover:text-fg-dim transition-colors"
            >
              {ex.name}
            </Link>
          ) : (
            <h2 className="font-display text-2xl lg:text-3xl leading-[1.05]">
              {ex.name}
            </h2>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="numeric text-2xl lg:text-3xl">{ex.sets.length}</div>
          <div className="eyebrow">{t("exercise.sets")}</div>
        </div>
      </div>

      {lib ? (
        <div className="flex gap-4 border-t hairline pt-4">
          <Link
            href={`/train/exercises/${lib.slug}`}
            className="shrink-0 lift rounded-md surface p-1.5"
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
                  <li key={i} className="flex gap-2 text-sm leading-snug">
                    <span className="font-mono text-fg-faint shrink-0 text-[11px] mt-0.5">
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
        <p className="text-sm text-fg-dim leading-relaxed border-t hairline pt-4">
          {ex.cue}
        </p>
      ) : null}

      <ul className="mt-5 divide-y hairline border-t hairline">
        {ex.sets.map((s, i) => (
          <li
            key={s.id}
            className="py-2.5 flex items-center gap-4 text-sm"
          >
            <span className="numeric text-fg-faint text-xs w-6">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex-1 numeric">
              {formatSetTarget(s.targetReps, s.targetWeight, s.targetRpe)}
            </span>
            {s.restSec && s.restSec > 0 ? (
              <span className="numeric text-fg-faint text-xs shrink-0">
                {s.restSec}s
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function PrimaryMuscleTags({ muscles }: { muscles: MuscleGroup[] }) {
  if (muscles.length === 0) return null;
  return (
    <div className="flex gap-1 flex-wrap">
      {muscles.map((m) => (
        <span
          key={m}
          className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-[0.14em] bg-bg-3 text-fg-dim"
        >
          {MUSCLE_LABELS[m]}
        </span>
      ))}
    </div>
  );
}

function formatSetTarget(
  reps: number,
  weight: number,
  rpe: number | undefined
): string {
  const parts: string[] = [];
  if (reps > 0) parts.push(`${reps} reps`);
  if (weight > 0) parts.push(`${weight} kg`);
  if (rpe) parts.push(`RPE ${rpe}`);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function dominantView(lib: ExerciseLibrary): "front" | "back" {
  const FRONT = new Set([
    "neck", "chest", "front_delts", "biceps", "forearms", "abs",
    "obliques", "adductors", "quads", "calves_front",
  ]);
  const all = [...lib.primaryMuscles, ...lib.secondaryMuscles];
  let front = 0;
  let back = 0;
  for (const m of all) {
    if (FRONT.has(m)) front++;
    else back++;
  }
  return back >= front ? "back" : "front";
}
