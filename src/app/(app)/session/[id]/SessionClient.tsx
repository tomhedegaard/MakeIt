"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { intlLocaleTag } from "@/i18n/config";
import { formatNumber } from "@/lib/utils";
import type { Exercise, Session } from "@/lib/workout";
import type { FormCheckQuota } from "@/lib/data/form-check-quota";
import AnatomyFigure from "@/components/anatomy/AnatomyFigure";
import SessionExerciseDemo from "@/components/exercise/SessionExerciseDemo";
import { buildCuePhaseMap } from "@/lib/exercise/cue-phase-mapping";
import { resolveSessionDemoAssetUrl } from "@/lib/data/session-demo-assets";
import Stepper from "@/components/ui/Stepper";
import RpeSelect from "@/components/ui/RpeSelect";
import RestTimer from "@/components/ui/RestTimer";
import { Sheet, SheetContent } from "@/components/ui/Sheet";
import Progress from "@/components/ui/Progress";
import SectionHeader from "@/components/ui/SectionHeader";
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
import { Camera, X } from "lucide-react";
import { ICON } from "@/components/ui/icon";
import { useYouth } from "@/components/youth/YouthContext";
import { PrimaryMuscleTags, StatCell, dominantView } from "./session-parts";

// 725 lines of camera + upload UI only matter once the member taps "Optag".
const FormCheckSheet = dynamic(() => import("@/components/ui/FormCheckSheet"), {
  ssr: false,
});

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
  const tag = intlLocaleTag(useLocale());
  const fmt = (n: number) => formatNumber(n, tag);

  const initialLogged = useMemo(() => buildInitialLogged(session), [session]);
  const initialPoint = useMemo(() => findResumePoint(session), [session]);

  const [exIdx, setExIdx] = useState(initialPoint.exIdx);
  const [setIdx, setSetIdx] = useState(initialPoint.setIdx);
  const [logged, setLogged] = useState<Logged>(initialLogged);
  const [resting, setResting] = useState<{ secs: number } | null>(null);
  const [doneOpen, setDoneOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [formCheckOpen, setFormCheckOpen] = useState(false);
  const youth = useYouth();
  const [queued, setQueued] = useState<FormQueueItem[]>([]);
  // Null until the server answers: no invented number in the done sheet (spec §7.6).
  const [repsAwarded, setRepsAwarded] = useState<number | null>(null);
  const [repsFailed, setRepsFailed] = useState(false);
  const [restAnnounce, setRestAnnounce] = useState("");
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
        if (res.ok) setRepsAwarded(res.repsAwarded);
        else setRepsFailed(true);
      });
      setDoneOpen(true);
      return;
    }

    if (set.restSec && set.restSec > 0) startRest(set.restSec);

    if (isLastSetOfEx) {
      setExIdx(exIdx + 1);
      setSetIdx(0);
    } else {
      setSetIdx(setIdx + 1);
    }
  }

  function startRest(secs: number) {
    setRestAnnounce("");
    setResting({ secs });
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
    <div className="min-h-dvh flex flex-col bg-bg">
      {/* Top bar */}
      <header className="safe-top sticky top-0 z-30 bg-bg border-b hairline">
        <div className="px-4 lg:px-6 h-14 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setExitOpen(true)}
            aria-label={t("topBar.exit")}
            className="size-11 surface-2 flex items-center justify-center"
          >
            <X {...ICON} className="size-5" />
          </button>

          <div className="flex-1 min-w-0 text-center">
            {/* The session is the page; exercise and HQ cards are h2s under it. */}
            <h1 className="text-micro text-fg-dim">
              {t("topBar.programLine", {
                programCode: session.programCode,
                week: session.week,
                dayLabel: session.dayLabel,
              })}
            </h1>
            <div className="tabular text-micro text-fg-dim">
              {t("topBar.setsCount", { completed: completedSets, total: totalSets })}
            </div>
          </div>

          <div className="size-11" aria-hidden />
        </div>

        <Progress
          value={completedSets}
          max={totalSets}
          label={t("topBar.setsCount", { completed: completedSets, total: totalSets })}
          className="bg-bg-3"
        />
      </header>

      {/* Main column */}
      <main className="flex-1 flex flex-col">
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
            className="surface-2 p-6 lg:p-8 space-y-4"
          >
            <h2 id="paused-heading" className="text-section numeric tracking-tight">
              {session.pausedReplacement.title}
            </h2>
            <p className="text-copy leading-relaxed text-fg-dim">
              {session.pausedReplacement.body}
            </p>
          </section>
        ) : null}

        {/* Exercise card */}
        <ExerciseSection
          key={ex.id}
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
          youth={Boolean(youth)}
        />

        {/* Targets row */}
        <section className="grid grid-cols-3 gap-px bg-line border hairline overflow-hidden">
          <div className="bg-bg-2 p-4 text-center">
            <div className="eyebrow mb-1 flex items-center justify-center gap-1.5">
              <span>{t("targets.goal")}</span>
              {set.adapted?.kind === "weight_reduced" ? (
                <span
                  className="text-micro px-1.5 py-0.5 bg-bg-3 text-fg-dim"
                  title={t("targets.reducedFrom", { weight: fmt(set.adapted.originalWeight) })}
                >
                  −{set.adapted.percent}%
                </span>
              ) : null}
            </div>
            <div className="numeric text-section">
              {fmt(set.targetWeight)}{" "}
              <span className="text-fg-dim text-meta">kg</span>
            </div>
            {set.adapted?.kind === "weight_reduced" ? (
              <div className="text-micro text-fg-dim mt-1 numeric">
                {t("targets.original", { weight: fmt(set.adapted.originalWeight) })}
              </div>
            ) : null}
          </div>
          <div className="bg-bg-2 p-4 text-center">
            <div className="eyebrow mb-1">{t("targets.reps")}</div>
            <div className="numeric text-section">{set.targetReps}</div>
          </div>
          <div className="bg-bg-2 p-4 text-center">
            <div className="eyebrow mb-1">{t("targets.rpe")}</div>
            <div className="numeric text-section">{set.targetRpe ? fmt(set.targetRpe) : "-"}</div>
          </div>
        </section>

        {/* Steppers */}
        <section className="space-y-3">
          <Stepper
            name="weight"
            value={current.weight}
            step={2.5}
            min={0}
            unit="kg"
            label={t("steppers.weight")}
            onChange={(weight) => patch({ weight })}
          />
          <Stepper
            name="reps"
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
          <ol className="surface-2 divide-y hairline overflow-hidden">
            {ex.sets.map((s, i) => {
              const sk = setKey(ex.id, s.id);
              const lg = logged[sk];
              const isCurrent = i === setIdx;
              const isOptional = s.optional === true;
              return (
                <li
                  key={s.id}
                  data-current={isCurrent}
                  className="px-4 py-3 flex items-center gap-3 text-copy"
                  style={{ background: isCurrent ? "var(--bg-3)" : undefined }}
                >
                  <span className="numeric text-fg-faint w-6 text-micro">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 numeric">
                    {lg?.done
                      ? `${fmt(lg.weight)} kg × ${lg.reps}${lg.rpe ? ` @ ${fmt(lg.rpe)}` : ""}`
                      : `${fmt(s.targetWeight)} kg × ${s.targetReps}${s.targetRpe ? ` @ ${fmt(s.targetRpe)}` : ""}`}
                  </span>
                  {isOptional ? (
                    <span className="text-micro text-fg-dim border hairline px-1.5 py-0.5">
                      {t("sets.optional")}
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
      </main>

      {/* Sticky CTA */}
      <div
        className="fixed left-0 right-0 bottom-0 z-40 border-t hairline bg-bg"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <div className="mx-auto max-w-3xl px-4 lg:px-6 pt-3 flex items-center gap-3">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => startRest(90)}
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
              onDone={() => {
                setResting(null);
                setRestAnnounce(t("restTimer.done"));
              }}
              onSkip={() => setResting(null)}
            />
          </div>
        </div>
      ) : null}
      <p role="status" className="sr-only">{restAnnounce}</p>

      {/* Done sheet */}
      <Sheet open={doneOpen} onOpenChange={setDoneOpen}>
        <SheetContent srTitle={t("done.title")}>
          <div className="text-center pb-4">
            <SectionHeader eyebrow={t("done.eyebrow")} title={t("done.title")} className="justify-center" />
            <p className="text-fg-dim text-meta mb-6 px-2">
              {t("done.body", { sets: completedSets })}
            </p>

            <div className="grid grid-cols-3 gap-px bg-line border hairline overflow-hidden mb-6">
              <StatCell label={t("done.sets")} value={completedSets} />
              <StatCell label={t("done.volume")} value={fmt(sessionVolume)} suffix={t("units.kg")} />
              <StatCell
                label={t("done.reps")}
                value={
                  repsAwarded != null ? (
                    `+ ${repsAwarded}`
                  ) : repsFailed ? (
                    "–"
                  ) : (
                    <span aria-label={t("done.repsPending")}>…</span>
                  )
                }
              />
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

      {youth ? null : (
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
      )}
    </div>
  );
}

/**
 * Exercise header for the current set in a session. When the exercise
 * is linked to the library (`ex.library` populated via the
 * exercise_id FK on session_exercises), we render:
 *   - compact MoveKit loop when demoAssetUrl resolves
 *   - mini AnatomyFigure when the slug has no loop (coach-made exercises)
 *   - top 3 cues from the structured array (phase-synced when a loop plays)
 *   - "Se hele øvelsen →" deep-link to /train/exercises/[slug]
 *
 * The form-check «Film» CTA stays a member camera upload — it is
 * not the library loop.
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
  youth = false,
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
  /** MakeIt Ung: no coach contact, so no filming for Munk (spec afsnit 3). */
  youth?: boolean;
}) {
  const t = useTranslations("Session.exercise");
  const lib = ex.library;
  const figureView = lib ? dominantView(lib) : "front";
  const demoAssetUrl = lib
    ? resolveSessionDemoAssetUrl(lib.demoAssetUrl, lib.slug)
    : null;
  const phases = lib?.phases ?? [];
  const [activePhaseIdx, setActivePhaseIdx] = useState<number | null>(null);
  const handlePhaseChange = useCallback((idx: number) => {
    setActivePhaseIdx(idx);
  }, []);
  // Show 3 cues inline — keep the page focused on the active set,
  // not on reading. The full list lives on the detail page.
  const inlineCues = lib?.cues.slice(0, 3) ?? [];
  const overflowCues = lib ? lib.cues.length - inlineCues.length : 0;
  const cuePhaseMap = useMemo(
    () => buildCuePhaseMap(inlineCues.length, phases.length),
    [inlineCues.length, phases.length],
  );

  return (
    <section className="surface-2 p-5 lg:p-7">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-title leading-[1]">
            {ex.name}
          </h2>
          <p className="mt-2 text-micro text-fg-dim tabular">
            {t("position", { current: exIdx + 1, total: totalExercises })}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="numeric text-title">
            {setIdx + 1}
            <span className="text-fg-dim text-copy">/{ex.sets.length}</span>
          </div>
          <div className="eyebrow">{t("sets")}</div>
        </div>
      </div>

      {lib ? (
        <div className="flex gap-4 border-t hairline pt-4">
          {demoAssetUrl ? (
            <SessionExerciseDemo
              demoAssetUrl={demoAssetUrl}
              phases={phases}
              onPhaseChange={handlePhaseChange}
              label={t("demoAria", { lift: ex.name })}
              playLabel={t("demoPlay")}
              pauseLabel={t("demoPause")}
              eyebrow={t("demo")}
            />
          ) : (
            <Link
              href={`/train/exercises/${lib.slug}`}
              className="shrink-0 lift surface p-1.5"
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
          )}

          <div className="min-w-0 flex-1 space-y-3">
            {inlineCues.length > 0 ? (
              <ol className="space-y-1.5">
                {inlineCues.map((cue, i) => {
                  const isActive =
                    demoAssetUrl != null &&
                    activePhaseIdx != null &&
                    cuePhaseMap[i] === activePhaseIdx;
                  return (
                    <li
                      key={i}
                      data-active={isActive}
                      className={`flex gap-2 text-copy leading-snug pl-2 -ml-2 border-l-2 transition-colors duration-200 ${
                        isActive ? "border-l-body text-fg" : "border-l-transparent"
                      }`}
                    >
                      <span
                        className={` shrink-0 text-micro mt-0.5 ${
 isActive ? "text-fg" : "text-fg-faint"
 }`}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{cue}</span>
                    </li>
                  );
                })}
              </ol>
            ) : null}

            <div className="flex items-center gap-2 flex-wrap">
              <PrimaryMuscleTags muscles={lib.primaryMuscles} />
              <Link
                href={`/train/exercises/${lib.slug}`}
                className="ml-auto inline-flex min-h-11 items-center text-micro text-fg-dim hover:text-fg transition-colors"
              >
                {t("seeFull")}
              </Link>
            </div>
          </div>
        </div>
      ) : ex.cue ? (
        // Legacy fallback — single cue line for free-text exercises
        <p className="text-meta text-fg-dim leading-relaxed border-t hairline pt-4">
          {ex.cue}
        </p>
      ) : null}

      {youth ? null : (
      <button
        type="button"
        data-form-film-cta=""
        data-form-set={setIdx + 1}
        onClick={onOpenFormCheck}
        className="mt-4 w-full min-h-11 text-left flex items-start gap-3 px-4 py-3 touch-app border hairline-strong text-fg hover:bg-bg-3 transition-colors duration-200 ease-out overflow-x-clip"
      >
        <Camera {...ICON} className="size-5 mt-0.5 shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-copy leading-snug">{t("formCheck", { set: setIdx + 1 })}</span>
            <span className="text-micro shrink-0">
              {t("duration")}
            </span>
          </span>
          <span className="block text-micro text-fg-dim mt-0.5 leading-snug break-words">
            {t("formCheckSub", { lift: ex.name })}
            {overflowCues > 0 ? t("moreCues", { count: overflowCues }) : null}
          </span>
        </span>
      </button>
      )}

      <FormCheckThread items={threads} copy={threadCopy} />
    </section>
  );
}
