"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updateSessionAction,
  type ExerciseInput,
  type SetInput,
} from "./actions";
import type { EditableSession } from "@/lib/data/coach-program";

function tmpId() {
  return `new-${Math.random().toString(36).slice(2, 9)}`;
}

export default function SessionEditor({ session }: { session: EditableSession }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [title, setTitle] = useState(session.title);
  const [dayLabel, setDayLabel] = useState(session.dayLabel);
  const [scheduledFor, setScheduledFor] = useState(session.scheduledFor ?? "");
  const [estMinutes, setEstMinutes] = useState(session.estimatedMinutes);

  const [exercises, setExercises] = useState<
    Array<ExerciseInput & { _key: string }>
  >(
    session.exercises.map((ex) => ({
      _key: ex.id,
      id: ex.id,
      position: ex.position,
      exerciseName: ex.exerciseName,
      cue: ex.cue,
      sets: ex.sets.map((s) => ({
        id: s.id,
        position: s.position,
        targetReps: s.targetReps,
        targetWeight: s.targetWeight,
        targetRpe: s.targetRpe,
        restSec: s.restSec,
      })),
    }))
  );

  function patchExercise(idx: number, patch: Partial<ExerciseInput>) {
    setExercises((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, ...patch } : e))
    );
  }

  function patchSet(exIdx: number, setIdx: number, patch: Partial<SetInput>) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx
          ? {
              ...ex,
              sets: ex.sets.map((s, j) =>
                j === setIdx ? { ...s, ...patch } : s
              ),
            }
          : ex
      )
    );
  }

  function addExercise() {
    setExercises((prev) => [
      ...prev,
      {
        _key: tmpId(),
        id: null,
        position: prev.length + 1,
        exerciseName: "Ny øvelse",
        cue: "",
        sets: [
          {
            id: null,
            position: 1,
            targetReps: 5,
            targetWeight: 60,
            targetRpe: null,
            restSec: 120,
          },
        ],
      },
    ]);
  }

  function removeExercise(idx: number) {
    if (!confirm("Slet denne øvelse fra sessionen?")) return;
    setExercises((prev) =>
      prev.filter((_, i) => i !== idx).map((e, i) => ({ ...e, position: i + 1 }))
    );
  }

  function addSet(exIdx: number) {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx) return ex;
        const last = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              id: null,
              position: ex.sets.length + 1,
              targetReps: last?.targetReps ?? 5,
              targetWeight: last?.targetWeight ?? 60,
              targetRpe: null,
              restSec: last?.restSec ?? 120,
            },
          ],
        };
      })
    );
  }

  function removeSet(exIdx: number, setIdx: number) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx
          ? {
              ...ex,
              sets: ex.sets
                .filter((_, j) => j !== setIdx)
                .map((s, j) => ({ ...s, position: j + 1 })),
            }
          : ex
      )
    );
  }

  function save() {
    setSaved(false);
    startTransition(async () => {
      const res = await updateSessionAction({
        sessionId: session.id,
        memberId: session.memberId,
        title,
        dayLabel,
        scheduledFor: scheduledFor || null,
        estimatedMinutes: estMinutes,
        exercises: exercises.map(({ _key, ...rest }) => {
          void _key;
          return rest;
        }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
        window.setTimeout(() => setSaved(false), 2200);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Top metadata */}
      <section className="surface-2 rounded-2xl p-5 lg:p-6">
        <div className="eyebrow mb-4">Session</div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Title">
            <input
              className="field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="Dag-label">
            <input
              className="field"
              value={dayLabel}
              onChange={(e) => setDayLabel(e.target.value)}
              placeholder="Dag A — Squat"
            />
          </Field>
          <Field label="Planlagt dato">
            <input
              type="date"
              className="field"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
            />
          </Field>
          <Field label="Est. minutter">
            <input
              type="number"
              className="field"
              min={20}
              max={180}
              value={estMinutes}
              onChange={(e) => setEstMinutes(Number(e.target.value) || 60)}
            />
          </Field>
        </div>
      </section>

      {/* Exercises */}
      {exercises.map((ex, exIdx) => (
        <section
          key={ex._key}
          className="surface-2 rounded-2xl p-5 lg:p-6 space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center gap-2 eyebrow">
                <span>Øvelse {String(exIdx + 1).padStart(2, "0")}</span>
                {ex.id ? null : (
                  <span className="numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2 py-0.5">
                    Ny
                  </span>
                )}
              </div>
              <input
                className="field font-display text-2xl py-2 h-auto"
                value={ex.exerciseName}
                onChange={(e) =>
                  patchExercise(exIdx, { exerciseName: e.target.value })
                }
              />
              <textarea
                className="field min-h-[60px] py-2 resize-none"
                rows={2}
                value={ex.cue ?? ""}
                onChange={(e) =>
                  patchExercise(exIdx, { cue: e.target.value })
                }
                placeholder="Coach-cue (vises i appen)"
              />
            </div>
            <button
              type="button"
              onClick={() => removeExercise(exIdx)}
              className="btn btn-ghost btn-sm shrink-0"
              aria-label="Slet øvelse"
            >
              Slet
            </button>
          </div>

          {/* Sets table */}
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-left">
                  <th className="px-2 py-2 eyebrow">#</th>
                  <th className="px-2 py-2 eyebrow">Reps</th>
                  <th className="px-2 py-2 eyebrow">Vægt (kg)</th>
                  <th className="px-2 py-2 eyebrow">RPE</th>
                  <th className="px-2 py-2 eyebrow">Hvile (s)</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {ex.sets.map((s, setIdx) => (
                  <tr key={s.id ?? `new-${setIdx}`} className="border-t hairline">
                    <td className="px-2 py-1.5 numeric text-xs text-fg-faint w-10">
                      {String(setIdx + 1).padStart(2, "0")}
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min={1}
                        max={50}
                        className="field h-9 numeric"
                        value={s.targetReps}
                        onChange={(e) =>
                          patchSet(exIdx, setIdx, {
                            targetReps: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        step={2.5}
                        min={0}
                        className="field h-9 numeric"
                        value={s.targetWeight}
                        onChange={(e) =>
                          patchSet(exIdx, setIdx, {
                            targetWeight: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        step={0.5}
                        min={5}
                        max={10}
                        className="field h-9 numeric"
                        value={s.targetRpe ?? ""}
                        onChange={(e) =>
                          patchSet(exIdx, setIdx, {
                            targetRpe: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        step={15}
                        min={0}
                        max={600}
                        className="field h-9 numeric"
                        value={s.restSec}
                        onChange={(e) =>
                          patchSet(exIdx, setIdx, {
                            restSec: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeSet(exIdx, setIdx)}
                        className="text-fg-dim hover:text-fg text-xs"
                        aria-label="Slet sæt"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => addSet(exIdx)}
            className="btn btn-sm"
          >
            + Tilføj sæt
          </button>
        </section>
      ))}

      <div>
        <button type="button" onClick={addExercise} className="btn">
          + Tilføj øvelse
        </button>
      </div>

      {/* Sticky save bar */}
      <div
        className="sticky bottom-0 z-30 bg-bg/95 backdrop-blur border-t hairline -mx-6 px-6 lg:mx-0 lg:px-0 lg:rounded-2xl lg:surface-2 lg:border-0 lg:py-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <div className="flex items-center gap-3 pt-3 lg:pt-0 lg:px-5">
          <Link
            href={`/coach/members/${session.memberId}`}
            className="btn btn-ghost btn-sm"
          >
            Tilbage
          </Link>
          {saved ? (
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-fg-dim">
              ✓ Gemt
            </span>
          ) : null}
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="btn btn-primary ml-auto"
          >
            {pending ? "Gemmer…" : "Gem ændringer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow block mb-2">{label}</span>
      {children}
    </label>
  );
}
