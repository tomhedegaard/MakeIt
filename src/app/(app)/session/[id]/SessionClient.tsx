"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Session } from "@/lib/workout";
import Stepper from "@/components/ui/Stepper";
import RpeSelect from "@/components/ui/RpeSelect";
import RestTimer from "@/components/ui/RestTimer";
import { Sheet, SheetContent } from "@/components/ui/Sheet";
import FormCheckSheet from "@/components/ui/FormCheckSheet";
import Container from "@/components/Container";

type Logged = Record<string, { weight: number; reps: number; rpe: number | null; done: boolean }>;

function setKey(exId: string, setId: string) {
  return `${exId}:${setId}`;
}

export default function SessionClient({ session }: { session: Session }) {
  const router = useRouter();
  const [exIdx, setExIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const [logged, setLogged] = useState<Logged>({});
  const [resting, setResting] = useState<{ secs: number } | null>(null);
  const [doneOpen, setDoneOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [formCheckOpen, setFormCheckOpen] = useState(false);

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
    const updated: Logged = {
      ...logged,
      [k]: { ...current, done: true },
    };
    setLogged(updated);

    const isLastSetOfEx = setIdx === ex.sets.length - 1;
    const isLastEx = exIdx === session.exercises.length - 1;

    if (isLastSetOfEx && isLastEx) {
      setDoneOpen(true);
      return;
    }

    // Start rest timer
    if (set.restSec && set.restSec > 0) setResting({ secs: set.restSec });

    // Advance pointer
    if (isLastSetOfEx) {
      setExIdx(exIdx + 1);
      setSetIdx(0);
    } else {
      setSetIdx(setIdx + 1);
    }
  }

  return (
    <div className="minh-dvh flex flex-col bg-bg">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur border-b hairline">
        <div className="px-4 lg:px-6 h-14 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setExitOpen(true)}
            aria-label="Afslut session"
            className="size-10 rounded-full surface-2 flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
              <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>

          <div className="flex-1 min-w-0 text-center">
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-fg-faint">
              {session.programCode} · uge {session.week} · {session.dayLabel}
            </div>
            <div className="numeric text-xs text-fg-dim">
              {completedSets} / {totalSets} sæt
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
      <Container size="narrow" className="flex-1 py-6 pb-32 lg:pb-12 space-y-6">
        {/* Exercise card */}
        <section className="surface-2 rounded-2xl p-5 lg:p-7">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="eyebrow mb-1">Øvelse {exIdx + 1} / {session.exercises.length}</div>
              <h1 className="font-display text-3xl lg:text-4xl leading-[1]">
                {ex.name}
              </h1>
            </div>
            <div className="text-right">
              <div className="numeric text-3xl lg:text-4xl">
                {setIdx + 1}<span className="text-fg-dim text-base">/{ex.sets.length}</span>
              </div>
              <div className="eyebrow">sæt</div>
            </div>
          </div>

          {ex.cue ? (
            <p className="text-sm text-fg-dim leading-relaxed border-t hairline pt-4">
              {ex.cue}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => setFormCheckOpen(true)}
            className="mt-4 w-full text-left flex items-center justify-between gap-3 surface rounded-xl px-4 py-3 lift touch-app"
          >
            <span className="flex items-center gap-3">
              <svg viewBox="0 0 24 24" className="size-4 text-fg-dim" fill="none" aria-hidden>
                <rect x="3" y="6" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
                <path d="M17 10l4-2v8l-4-2v-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <circle cx="9" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              <span className="text-sm">Form-check med AI</span>
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
              ~6 sek →
            </span>
          </button>
        </section>

        {/* Targets row */}
        <section className="grid grid-cols-3 gap-px bg-line border hairline rounded-lg overflow-hidden">
          <div className="bg-bg-2 p-4 text-center">
            <div className="eyebrow mb-1">Mål</div>
            <div className="numeric text-xl">{set.targetWeight}<span className="text-fg-dim text-sm">kg</span></div>
          </div>
          <div className="bg-bg-2 p-4 text-center">
            <div className="eyebrow mb-1">Reps</div>
            <div className="numeric text-xl">{set.targetReps}</div>
          </div>
          <div className="bg-bg-2 p-4 text-center">
            <div className="eyebrow mb-1">RPE</div>
            <div className="numeric text-xl">
              {set.targetRpe ? set.targetRpe : "—"}
            </div>
          </div>
        </section>

        {/* Steppers */}
        <section className="space-y-3">
          <Stepper
            value={current.weight}
            step={2.5}
            min={0}
            unit="kg"
            label="Vægt"
            onChange={(weight) => patch({ weight })}
          />
          <Stepper
            value={current.reps}
            step={1}
            min={0}
            unit="reps"
            label="Reps"
            onChange={(reps) => patch({ reps })}
          />
        </section>

        {/* RPE */}
        <section>
          <div className="eyebrow mb-3">RPE — hvor tungt føltes det?</div>
          <RpeSelect
            value={current.rpe}
            onChange={(rpe) => patch({ rpe })}
          />
        </section>

        {/* Remaining sets list */}
        <section>
          <div className="eyebrow mb-3">Sæt i dette øvelse</div>
          <ol className="surface-2 rounded-lg divide-y hairline overflow-hidden">
            {ex.sets.map((s, i) => {
              const sk = setKey(ex.id, s.id);
              const lg = logged[sk];
              const isCurrent = i === setIdx;
              return (
                <li
                  key={s.id}
                  data-current={isCurrent}
                  className="px-4 py-3 flex items-center gap-3 text-sm"
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
                  {lg?.done ? (
                    <span className="text-fg" aria-label="Færdig">✓</span>
                  ) : isCurrent ? (
                    <span className="eyebrow text-fg">Nu</span>
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
          <button type="button" className="btn btn-sm" onClick={() => setResting({ secs: 90 })}>
            Hvil
          </button>
          <button type="button" className="btn btn-primary btn-xl flex-1" onClick={logSet}>
            Log sæt →
          </button>
        </div>
      </div>

      {/* Rest timer overlay */}
      {resting ? (
        <div
          className="fixed left-0 right-0 z-40 px-4"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)" }}
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
            <div className="eyebrow mb-3">Session done</div>
            <h2 className="font-display text-4xl mb-2">Godt arbejde.</h2>
            <p className="text-fg-dim text-sm mb-6 px-2">
              Du loggede {completedSets} sæt og holdt dig på programmet.
              Vi sender dataene videre til din coach for ugentlig review.
            </p>

            <div className="grid grid-cols-3 gap-px bg-line border hairline rounded-lg overflow-hidden mb-6">
              <div className="bg-bg-2 p-3 text-center">
                <div className="eyebrow mb-1">Sæt</div>
                <div className="numeric text-2xl">{completedSets}</div>
              </div>
              <div className="bg-bg-2 p-3 text-center">
                <div className="eyebrow mb-1">Volumen</div>
                <div className="numeric text-2xl">
                  {Object.values(logged).reduce(
                    (a, v) => a + (v.done ? v.weight * v.reps : 0),
                    0
                  )}
                  <span className="text-fg-dim text-sm">kg</span>
                </div>
              </div>
              <div className="bg-bg-2 p-3 text-center">
                <div className="eyebrow mb-1">Reps</div>
                <div className="numeric text-2xl">+ 250</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link href="/community" className="btn">Del til crew</Link>
              <Link href="/dashboard" className="btn btn-primary">Til Today</Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Exit confirm */}
      <Sheet open={exitOpen} onOpenChange={setExitOpen}>
        <SheetContent title="Afslut session?" description="Dine loggede sæt gemmes — du kan fortsætte senere.">
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button type="button" className="btn" onClick={() => setExitOpen(false)}>
              Bliv
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => router.push("/dashboard")}
            >
              Afslut
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <FormCheckSheet
        open={formCheckOpen}
        onOpenChange={setFormCheckOpen}
        exerciseName={ex.name}
      />
    </div>
  );
}
