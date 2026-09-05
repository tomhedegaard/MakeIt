"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Exercise, Session } from "@/lib/workout";
import type { FormCheckQuota } from "@/lib/data/form-check-quota";
import AnatomyFigure from "@/components/anatomy/AnatomyFigure";
import { MUSCLE_LABELS } from "@/lib/data/muscle-groups";
import Stepper from "@/components/ui/Stepper";
import RpeSelect from "@/components/ui/RpeSelect";
import RestTimer from "@/components/ui/RestTimer";
import { Sheet, SheetContent } from "@/components/ui/Sheet";
import FormCheckSheet from "@/components/ui/FormCheckSheet";
import FormCheckThread from "@/components/form-check/FormCheckThread";
import {
  demoFormQueueItems,
  threadsForLift,
  type FormQueueItem,
} from "@/lib/form-queue/queue";
import Container from "@/components/Container";
import HrvReadinessNudge from "@/components/hrv/HrvReadinessNudge";
import AdaptationCard from "@/components/adaptive/AdaptationCard";
import type { ActiveAdaptation } from "@/lib/adaptive/explanation";
import { logSetAction, completeSessionAction } from "./actions";

type Logged = Record<
  string,
  { weight: number; reps: number; rpe: number | null; done: boolean }
>;

function setKey(exId: string, setId: string) {
  return `${exId}:${setId}`;
}

/**
 * Hydrate `logged` from any sets that already have logged_at set in DB.
 */
function buildInitialLogged(session: Session): Logged {
  const m: Logged = {};
  for (const ex of session.exercises) {
    for (const s of ex.sets) {
      if (s.done) {
        m[setKey(ex.id, s.id)] = {
          weight: s.loggedWeight ?? s.targetWeight,
          reps: s.loggedReps ?? s.targetReps,
          rpe: s.loggedRpe ?? s.targetRpe ?? null,
          done: true,
        };
      }
    }
  }
  return m;
}

/**
 * Find the first not-yet-logged set across all exercises.
 */
function findResumePoint(session: Session): { exIdx: number; setIdx: number } {
  for (let i = 0; i < session.exercises.length; i++) {
    const ex = session.exercises[i];
    for (let j = 0; j < ex.sets.length; j++) {
      if (!ex.sets[j].done) return { exIdx: i, setIdx: j };
    }
  }
  // All done — point at the last set so UI doesn't crash.
  const last = session.exercises.length - 1;
  return { exIdx: last, setIdx: session.exercises[last].sets.length - 1 };
}

export default function SessionClient({
  session,
  formCheckQuota,
  readinessNudge = null,
  adaptation = null,
}: {
  session: Session;
  formCheckQuota: FormCheckQuota;
  readinessNudge?: { bucket: "low" | "very_low" } | null;
  adaptation?: ActiveAdaptation | null;
}) {
  const router = useRouter();
  const t = useTranslations("Session");

  const initialLogged = useMemo(() => buildInitialLogged(session), [session]);
  const initialPoint = useMemo(() => findResumePoint(session), [session]);

  const [exIdx, setExIdx] = useState(initialPoint.exIdx);
  const [setIdx, setSetIdx] = useState(initialPoint.setIdx);
  const [logged, setLogged] = useState<Logged>(initialLogged);
  const [resting, setResting] = useState<{ secs: number } | null>(null);
  const [doneOpen, setDoneOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [formCheckOpen, setFormCheckOpen] = useState(false);
  const [queued, setQueued] = useState<FormQueueItem[]>([]);
  const [repsAwarded, setRepsAwarded] = useState<number>(250);
  const [, startTransition] = useTransition();

  const ex = session.exercises[exIdx];
  const set = ex.sets[setIdx];
  const k = setKey(ex.id, set.id);
  const current = logged[k] ?? {
    weight: set.targetWeight,
    reps: set.targetReps,
    rpe: set.targetRpe ?? null,
    done: false,
  };

  const totalSets = useMemo(
    () => session.exercises.reduce((a, e) => a + e.sets.length, 0),
    [session]
  );
  const completedSets = useMemo(
    () => Object.values(logged).filter((v) => v.done).length,
    [logged]
  );
  const progressPct = (completedSets / totalSets) * 100;

  function patch(partial: Partial<Logged[string]>) {
    setLogged((prev) => ({
      ...prev,
      [k]: { ...current, ...partial },
    }));
  }

  function logSet() {
    // Optimistic local update
    const updated: Logged = {
      ...logged,
      [k]: { ...current, done: true },
    };
    setLogged(updated);

    // Persist (no-op in demo mode)
    startTransition(async () => {
      await logSetAction({
        sessionId: session.id,
        setId: set.id,
        weight: current.weight,
        reps: current.reps,
        rpe: current.rpe,
      });
    });

    const isLastSetOfEx = setIdx === ex.sets.length - 1;
    const isLastEx = exIdx === session.exercises.length - 1;

    if (isLastSetOfEx && isLastEx) {
      // Complete the session and award Reps
      startTransition(async () => {
        const res = await completeSessionAction(session.id);
        if (res.ok) setRepsAwarded(res.repsAwarded || 250);
      });
      setDoneOpen(true);
      return;
    }

    if (set.restSec && set.restSec > 0) setResting({ secs: set.restSec });

    if (isLastSetOfEx) {
      setExIdx(exIdx + 1);
      setSetIdx(0);
    } else {
      setSetIdx(setIdx + 1);
    }
  }

  const sessionVolume = useMemo(
    () =>
      Object.values(logged).reduce(
        (a, v) => a + (v.done ? v.weight * v.reps : 0),
        0
      ),
    [logged]
  );

  return (
    <div className="minh-dvh flex flex-col bg-bg">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur border-b hairline">
        <div className="px-4 lg:px-6 h-14 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setExitOpen(true)}
            aria-label={t("topBar.exit")}
            className="size-10 rounded-full surface-2 flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
              <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>

          <div className="flex-1 min-w-0 text-center">
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-fg-faint">
              {t("topBar.programLine", {
                programCode: session.programCode,
                week: session.week,
                dayLabel: session.dayLabel,
              })}
            </div>
            <div className="numeric text-xs text-fg-dim">
              {t("topBar.setsCount", { completed: completedSets, total: totalSets })}
            </div>
          </div>

          <div className="size-10" aria-hidden />
        </div>

        <div className="h-1 bg-bg-3 overflow-hidden">
          <div
            className="h-full bg-fg transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      {/* Main column */}
      <Container
        size="narrow"
        className={
          resting
            ? "flex-1 px-4 py-6 pb-52 md:px-10 lg:pb-12 space-y-6"
            : "flex-1 px-4 py-6 pb-40 md:px-10 lg:pb-12 space-y-6"
        }
      >
        {/*
          Adaptive engine card supersedes the V2.4 nudge: if we already
          adapted the session, the card carries the richer "here's what
          we changed" message and the nudge's "your HRV is low" advice
          would be redundant or outdated.
        */}
        {adaptation ? (
          <AdaptationCard adaptation={adaptation} sessionId={session.id} />
        ) : (
          <HrvReadinessNudge nudge={readinessNudge} />
        )}

        {/*
          Paused session: render the active-recovery replacement block
          instead of the exercise + logging UI. Members shouldn't be
          tempted to log sets when the engine + Munk have agreed today
          is a rest day.
        */}
        {session.pausedReplacement ? (
          <section
            aria-labelledby="paused-heading"
            className="surface-2 rounded-2xl p-6 lg:p-8 space-y-4 border hairline"
          >
            <h2 id="paused-heading" className="text-xl numeric tracking-tight">
              {session.pausedReplacement.title}
            </h2>
            <p className="text-sm leading-relaxed text-fg-dim">
              {session.pausedReplacement.body}
            </p>
          </section>
        ) : null}

        {/* Exercise card */}
        <ExerciseSection
          ex={ex}
          exIdx={exIdx}
          setIdx={setIdx}
          totalExercises={session.exercises.length}
          threads={mergeThreads(ex.name, queued)}
          threadCopy={{
            eyebrow: t("exercise.thread.eyebrow"),
            pending: t("exercise.thread.pending"),
            reviewed: t("exercise.thread.reviewed"),
            voice: t("exercise.thread.voice"),
            youFilmed: t("exercise.thread.youFilmed"),
            munkReply: t("exercise.thread.munkReply"),
          }}
          onOpenFormCheck={() => setFormCheckOpen(true)}
        />

        {/* Targets row */}
        <section className="grid grid-cols-3 gap-px bg-line border hairline rounded-lg overflow-hidden">
          <div className="bg-bg-2 p-4 text-center">
            <div className="eyebrow mb-1 flex items-center justify-center gap-1.5">
              <span>{t("targets.goal")}</span>
              {set.adapted?.kind === "weight_reduced" ? (
                <span
                  className="text-[9px] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-sm bg-bg-3 text-fg-dim"
                  title={`Reduceret fra ${set.adapted.originalWeight} kg`}
                >
                  −{set.adapted.percent}%
                </span>
              ) : null}
            </div>
            <div className="numeric text-xl">
              {set.targetWeight}
              <span className="text-fg-dim text-sm">kg</span>
            </div>
            {set.adapted?.kind === "weight_reduced" ? (
              <div className="text-[10px] font-mono text-fg-faint mt-1 numeric">
                org {set.adapted.originalWeight} kg
              </div>
            ) : null}
          </div>
          <div className="bg-bg-2 p-4 text-center">
            <div className="eyebrow mb-1">{t("targets.reps")}</div>
            <div className="numeric text-xl">{set.targetReps}</div>
          </div>
          <div className="bg-bg-2 p-4 text-center">
            <div className="eyebrow mb-1">{t("targets.rpe")}</div>
            <div className="numeric text-xl">{set.targetRpe ? set.targetRpe : "—"}</div>
          </div>
        </section>

        {/* Steppers */}
        <section className="space-y-3">
          <Stepper
            value={current.weight}
            step={2.5}
            min={0}
            unit="kg"
            label={t("steppers.weight")}
            onChange={(weight) => patch({ weight })}
          />
          <Stepper
            value={current.reps}
            step={1}
            min={0}
            unit="reps"
            label={t("steppers.reps")}
            onChange={(reps) => patch({ reps })}
          />
        </section>

        {/* RPE */}
        <section>
          <div className="eyebrow mb-3">{t("rpe.label")}</div>
          <RpeSelect value={current.rpe} onChange={(rpe) => patch({ rpe })} />
        </section>

        {/* Sets list for this exercise */}
        <section>
          <div className="eyebrow mb-3">{t("sets.title")}</div>
          <ol className="surface-2 rounded-lg divide-y hairline overflow-hidden">
            {ex.sets.map((s, i) => {
              const sk = setKey(ex.id, s.id);
              const lg = logged[sk];
              const isCurrent = i === setIdx;
              const isOptional = s.optional === true;
              return (
                <li
                  key={s.id}
                  data-current={isCurrent}
                  className={`px-4 py-3 flex items-center gap-3 text-sm ${
                    isOptional ? "opacity-55" : ""
                  }`}
                  style={{ background: isCurrent ? "var(--bg-3)" : undefined }}
                >
                  <span className="numeric text-fg-faint w-6 text-xs">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 numeric">
                    {lg?.done
                      ? `${lg.weight}kg × ${lg.reps}${lg.rpe ? ` @ ${lg.rpe}` : ""}`
                      : `${s.targetWeight}kg × ${s.targetReps}${s.targetRpe ? ` @ ${s.targetRpe}` : ""}`}
                  </span>
                  {isOptional ? (
                    <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
                      valgfri
                    </span>
                  ) : null}
                  {lg?.done ? (
                    <span className="text-fg" aria-label={t("sets.done")}>✓</span>
                  ) : isCurrent ? (
                    <span className="eyebrow text-fg">{t("sets.now")}</span>
                  ) : (
                    <span className="text-fg-faint" aria-hidden>·</span>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      </Container>

      {/* Sticky CTA */}
      <div
        className="fixed left-0 right-0 bottom-0 z-40 border-t hairline bg-bg/95 backdrop-blur"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <div className="mx-auto max-w-3xl px-4 lg:px-6 pt-3 flex items-center gap-3">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setResting({ secs: 90 })}
          >
            {t("cta.rest")}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-xl flex-1"
            onClick={logSet}
          >
            {t("cta.logSet")}
          </button>
        </div>
      </div>

      {/* Rest timer overlay */}
      {resting ? (
        <div
          className="fixed left-0 right-0 z-40 px-4"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 112px)" }}
        >
          <div className="mx-auto max-w-3xl">
            <RestTimer
              durationSec={resting.secs}
              onDone={() => setResting(null)}
              onSkip={() => setResting(null)}
            />
          </div>
        </div>
      ) : null}

      {/* Done sheet */}
      <Sheet open={doneOpen} onOpenChange={setDoneOpen}>
        <SheetContent>
          <div className="text-center pb-4">
            <div className="eyebrow mb-3">{t("done.eyebrow")}</div>
            <h2 className="font-display text-4xl mb-2">{t("done.title")}</h2>
            <p className="text-fg-dim text-sm mb-6 px-2">
              {t("done.body", { sets: completedSets })}
            </p>

            <div className="grid grid-cols-3 gap-px bg-line border hairline rounded-lg overflow-hidden mb-6">
              <div className="bg-bg-2 p-3 text-center">
                <div className="eyebrow mb-1">{t("done.sets")}</div>
                <div className="numeric text-2xl">{completedSets}</div>
              </div>
              <div className="bg-bg-2 p-3 text-center">
                <div className="eyebrow mb-1">{t("done.volume")}</div>
                <div className="numeric text-2xl">
                  {sessionVolume}
                  <span className="text-fg-dim text-sm">kg</span>
                </div>
              </div>
              <div className="bg-bg-2 p-3 text-center">
                <div className="eyebrow mb-1">{t("done.reps")}</div>
                <div className="numeric text-2xl">
                  + {repsAwarded}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link href="/community" className="btn">{t("done.share")}</Link>
              <Link href="/dashboard" className="btn btn-primary">
                {t("done.toToday")}
              </Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Exit confirm */}
      <Sheet open={exitOpen} onOpenChange={setExitOpen}>
        <SheetContent
          title={t("exit.title")}
          description={t("exit.description")}
        >
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button type="button" className="btn" onClick={() => setExitOpen(false)}>
              {t("exit.stay")}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => router.push("/dashboard")}
            >
              {t("exit.confirm")}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <FormCheckSheet
        open={formCheckOpen}
        onOpenChange={setFormCheckOpen}
        exerciseName={ex.name}
        context={{
          exerciseId: ex.library?.exerciseId,
          cues: ex.library?.cues,
          mistakes: ex.library?.mistakes,
          sessionId: session.id,
          setIndex: setIdx + 1,
          setId: set.id,
        }}
        onQueued={(item) =>
          setQueued((prev) => [item, ...prev.filter((p) => p.id !== item.id)])
        }
        quota={formCheckQuota}
      />
    </div>
  );
}

/**
 * Exercise header for the current set in a session. When the exercise
 * is linked to the library (`ex.library` populated via the
 * exercise_id FK on session_exercises), we render:
 *   - mini AnatomyFigure (static, shows recruited muscles)
 *   - top 3 cues from the structured array
 *   - "Se hele øvelsen →" deep-link to /train/exercises/[slug]
 *
 * When library is null (coach typed a free-text exercise), we fall
 * back to the legacy single-cue display so nothing breaks.
 */
function mergeThreads(exerciseName: string, extra: FormQueueItem[]) {
  const seeded = threadsForLift(demoFormQueueItems(), exerciseName);
  const byId = new Map<string, FormQueueItem>();
  for (const item of [...seeded, ...threadsForLift(extra, exerciseName)]) {
    byId.set(item.id, item);
  }
  return Array.from(byId.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

function ExerciseSection({
  ex,
  exIdx,
  setIdx,
  totalExercises,
  threads,
  threadCopy,
  onOpenFormCheck,
}: {
  ex: Exercise;
  exIdx: number;
  setIdx: number;
  totalExercises: number;
  threads: FormQueueItem[];
  threadCopy: {
    eyebrow: string;
    pending: string;
    reviewed: string;
    voice: string;
    youFilmed: string;
    munkReply: string;
  };
  onOpenFormCheck: () => void;
}) {
  const t = useTranslations("Session.exercise");
  const lib = ex.library;
  const figureView = lib ? dominantView(lib) : "front";
  // Show 3 cues inline — keep the page focused on the active set,
  // not on reading. The full list lives on the detail page.
  const inlineCues = lib?.cues.slice(0, 3) ?? [];
  const overflowCues = lib ? lib.cues.length - inlineCues.length : 0;

  return (
    <section className="surface-2 rounded-2xl p-5 lg:p-7">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0 flex-1">
          <div className="eyebrow mb-1">
            {t("position", { current: exIdx + 1, total: totalExercises })}
          </div>
          <h1 className="font-display text-3xl lg:text-4xl leading-[1]">
            {ex.name}
          </h1>
        </div>
        <div className="text-right shrink-0">
          <div className="numeric text-3xl lg:text-4xl">
            {setIdx + 1}
            <span className="text-fg-dim text-base">/{ex.sets.length}</span>
          </div>
          <div className="eyebrow">{t("sets")}</div>
        </div>
      </div>

      {lib ? (
        <div className="flex gap-4 border-t hairline pt-4">
          <Link
            href={`/train/exercises/${lib.slug}`}
            className="shrink-0 lift rounded-md surface p-1.5"
            aria-label={t("openDetails")}
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

            <div className="flex items-center gap-2 flex-wrap">
              <PrimaryMuscleTags muscles={lib.primaryMuscles} />
              <Link
                href={`/train/exercises/${lib.slug}`}
                className="ml-auto text-[10px] font-mono uppercase tracking-[0.14em] text-fg-dim hover:text-fg transition-colors"
              >
                {t("seeFull")}
              </Link>
            </div>
          </div>
        </div>
      ) : ex.cue ? (
        // Legacy fallback — single cue line for free-text exercises
        <p className="text-sm text-fg-dim leading-relaxed border-t hairline pt-4">
          {ex.cue}
        </p>
      ) : null}

      <button
        type="button"
        data-form-film-cta=""
        data-form-set={setIdx + 1}
        onClick={onOpenFormCheck}
        className="mt-4 w-full min-h-11 text-left flex items-start gap-3 rounded-xl px-4 py-3 lift touch-app bg-fg text-bg overflow-x-clip"
      >
        <svg viewBox="0 0 24 24" className="size-4 mt-1 shrink-0" fill="none" aria-hidden>
          <rect x="3" y="6" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M17 10l4-2v8l-4-2v-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="9" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        <span className="flex-1 min-w-0">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-sm leading-snug">{t("formCheck", { set: setIdx + 1 })}</span>
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] shrink-0">
              {t("duration")}
            </span>
          </span>
          <span className="block text-[10px] font-mono uppercase tracking-[0.1em] opacity-70 mt-0.5 leading-snug break-words">
            {t("formCheckSub", { lift: ex.name })}
          </span>
          {overflowCues > 0 ? (
            <span className="block opacity-60 mt-0.5">{t("moreCues", { count: overflowCues })}</span>
          ) : null}
        </span>
      </button>

      <FormCheckThread items={threads} copy={threadCopy} />
    </section>
  );
}

function PrimaryMuscleTags({ muscles }: { muscles: import("@/lib/data/muscle-groups").MuscleGroup[] }) {
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

function dominantView(
  lib: NonNullable<Exercise["library"]>,
): "front" | "back" {
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
