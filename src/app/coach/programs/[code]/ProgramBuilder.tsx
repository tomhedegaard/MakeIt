"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ProgramBuilder as ProgramData } from "@/lib/data/coach-programs";
import type { AssignableMember } from "@/lib/data/coach-programs";
import {
  saveProgramAction,
  assignProgramAction,
  type DayInput,
} from "@/app/coach/programs/actions";

const TYPES = ["Strength", "Hypertrophy", "Hybrid", "Specialization"];
const LEVELS = ["Beginner", "Intermediate", "Advanced", "All levels"];

type LibraryExercise = { id: string; name: string };

/* Draft state — `id` null = new row, `key` is the stable React key. */
type DraftSet = { reps: number; weight: number; rpe: number | null; rest_sec: number };
type DraftExercise = {
  id: string | null;
  key: string;
  exerciseId: string | null;
  exerciseName: string;
  cue: string | null;
  sets: DraftSet[];
};
type DraftDay = {
  id: string | null;
  key: string;
  dayLabel: string;
  title: string;
  estimatedMinutes: number | null;
  exercises: DraftExercise[];
};

let keySeq = 0;
const nextKey = () => `k${keySeq++}`;

export default function ProgramBuilder({
  program,
  library,
  members,
}: {
  program: ProgramData;
  library: LibraryExercise[];
  members: AssignableMember[];
}) {
  const [name, setName] = useState(program.name);
  const [type, setType] = useState(program.type);
  const [description, setDescription] = useState(program.description ?? "");
  const [weeks, setWeeks] = useState(program.weeks);
  const [level, setLevel] = useState(program.level ?? LEVELS[1]);
  const [isPublished, setIsPublished] = useState(program.isPublished);

  const [days, setDays] = useState<DraftDay[]>(() =>
    program.days.map((d) => ({
      id: d.id,
      key: nextKey(),
      dayLabel: d.dayLabel,
      title: d.title,
      estimatedMinutes: d.estimatedMinutes,
      exercises: d.exercises.map((e) => ({
        id: e.id,
        key: nextKey(),
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        cue: e.cue,
        sets: e.sets.map((s) => ({ ...s })),
      })),
    })),
  );

  const [saving, startSave] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  /* -------- day mutations -------- */
  function patchDay(di: number, patch: Partial<DraftDay>) {
    setDays((prev) => prev.map((d, i) => (i === di ? { ...d, ...patch } : d)));
  }
  function addDay() {
    setDays((prev) => [
      ...prev,
      {
        id: null,
        key: nextKey(),
        dayLabel: `Dag ${String.fromCharCode(65 + prev.length)}`,
        title: "",
        estimatedMinutes: 60,
        exercises: [],
      },
    ]);
  }
  function removeDay(di: number) {
    setDays((prev) => prev.filter((_, i) => i !== di));
  }

  /* -------- exercise mutations -------- */
  function patchExercise(di: number, ei: number, patch: Partial<DraftExercise>) {
    setDays((prev) =>
      prev.map((d, i) =>
        i !== di
          ? d
          : {
              ...d,
              exercises: d.exercises.map((e, j) =>
                j === ei ? { ...e, ...patch } : e,
              ),
            },
      ),
    );
  }
  function addExercise(di: number) {
    const first = library[0];
    patchDay(di, {
      exercises: [
        ...days[di].exercises,
        {
          id: null,
          key: nextKey(),
          exerciseId: first?.id ?? null,
          exerciseName: first?.name ?? "",
          cue: null,
          sets: [{ reps: 5, weight: 0, rpe: null, rest_sec: 120 }],
        },
      ],
    });
  }
  function removeExercise(di: number, ei: number) {
    patchDay(di, {
      exercises: days[di].exercises.filter((_, j) => j !== ei),
    });
  }

  /* -------- set mutations -------- */
  function patchSet(di: number, ei: number, si: number, patch: Partial<DraftSet>) {
    const ex = days[di].exercises[ei];
    patchExercise(di, ei, {
      sets: ex.sets.map((s, k) => (k === si ? { ...s, ...patch } : s)),
    });
  }
  function addSet(di: number, ei: number) {
    const ex = days[di].exercises[ei];
    const last = ex.sets[ex.sets.length - 1];
    patchExercise(di, ei, {
      sets: [
        ...ex.sets,
        last ? { ...last } : { reps: 5, weight: 0, rpe: null, rest_sec: 120 },
      ],
    });
  }
  function removeSet(di: number, ei: number, si: number) {
    const ex = days[di].exercises[ei];
    patchExercise(di, ei, { sets: ex.sets.filter((_, k) => k !== si) });
  }

  /* -------- save -------- */
  function save() {
    setSaveError(null);
    const payloadDays: DayInput[] = days.map((d, di) => ({
      id: d.id,
      position: di,
      dayLabel: d.dayLabel,
      title: d.title || d.dayLabel,
      estimatedMinutes: d.estimatedMinutes,
      exercises: d.exercises.map((e, ei) => ({
        id: e.id,
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        cue: e.cue,
        position: ei,
        sets: e.sets,
      })),
    }));
    startSave(async () => {
      const res = await saveProgramAction({
        programId: program.id,
        name,
        type,
        description: description || null,
        weeks,
        level,
        isPublished,
        days: payloadDays,
      });
      if (res.ok) {
        setSavedAt(new Date().toLocaleTimeString("da-DK"));
        // New rows now have ids server-side; reload to re-key cleanly.
        window.location.reload();
      } else {
        setSaveError(res.error ?? "Kunne ikke gemme");
      }
    });
  }

  const totalExercises = days.reduce((n, d) => n + d.exercises.length, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="pt-2">
        <div className="eyebrow mb-2 flex items-center gap-2">
          <Link href="/coach/programs" className="hover:text-fg">
            Programmer
          </Link>
          <span aria-hidden>·</span>
          <span className="numeric">{program.code}</span>
        </div>
        <h1 className="font-display text-[clamp(2rem,5vw,3rem)] leading-[0.95]">
          {name || "Uden navn"}.
        </h1>
        <p className="mt-2 text-fg-dim text-sm">
          {days.length} {days.length === 1 ? "dag" : "dage"} · {totalExercises}{" "}
          øvelser · {weeks} uger ved publicering
        </p>
      </header>

      {/* Program meta */}
      <section className="surface-2 rounded-xl p-5 md:p-6 space-y-4">
        <div className="eyebrow">Program</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs text-fg-dim">Navn</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
              maxLength={80}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-fg-dim">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="input w-full"
            >
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-fg-dim">Niveau</span>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="input w-full"
            >
              {LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-fg-dim">Uger</span>
            <input
              type="number"
              min={1}
              max={52}
              value={weeks}
              onChange={(e) => setWeeks(parseInt(e.target.value, 10) || 1)}
              className="input w-full"
            />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs text-fg-dim">Beskrivelse</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="input w-full"
              placeholder="Kort om programmets formål"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
          />
          <span>Publiceret — synlig + klar til at assigne</span>
        </label>
      </section>

      {/* Days */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="eyebrow">Dage</div>
          <button type="button" onClick={addDay} className="btn btn-sm">
            + Tilføj dag
          </button>
        </div>

        {days.length === 0 ? (
          <p className="text-fg-dim text-sm">
            Ingen dage endnu. Tilføj en dag for at begynde.
          </p>
        ) : (
          days.map((day, di) => (
            <article key={day.key} className="surface-2 rounded-xl p-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-[120px_1fr_120px_auto] sm:items-end">
                <label className="space-y-1.5">
                  <span className="text-xs text-fg-dim">Dag-label</span>
                  <input
                    value={day.dayLabel}
                    onChange={(e) => patchDay(di, { dayLabel: e.target.value })}
                    className="input w-full"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs text-fg-dim">Titel</span>
                  <input
                    value={day.title}
                    onChange={(e) => patchDay(di, { title: e.target.value })}
                    placeholder="fx Squat — tung"
                    className="input w-full"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs text-fg-dim">Est. min</span>
                  <input
                    type="number"
                    min={0}
                    value={day.estimatedMinutes ?? ""}
                    onChange={(e) =>
                      patchDay(di, {
                        estimatedMinutes: e.target.value
                          ? parseInt(e.target.value, 10)
                          : null,
                      })
                    }
                    className="input w-full"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeDay(di)}
                  className="btn btn-ghost btn-sm"
                >
                  Slet dag
                </button>
              </div>

              {/* Exercises */}
              <div className="space-y-3 border-t hairline pt-4">
                {day.exercises.map((ex, ei) => (
                  <div key={ex.key} className="surface rounded-lg p-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                      <label className="space-y-1.5">
                        <span className="text-xs text-fg-dim">Øvelse</span>
                        <select
                          value={ex.exerciseId ?? ""}
                          onChange={(e) => {
                            const lib = library.find(
                              (l) => l.id === e.target.value,
                            );
                            patchExercise(di, ei, {
                              exerciseId: lib?.id ?? null,
                              exerciseName: lib?.name ?? "",
                            });
                          }}
                          className="input w-full"
                        >
                          {library.length === 0 ? (
                            <option value="">Ingen øvelser i bibliotek</option>
                          ) : null}
                          {library.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs text-fg-dim">Cue (valgfri)</span>
                        <input
                          value={ex.cue ?? ""}
                          onChange={(e) =>
                            patchExercise(di, ei, {
                              cue: e.target.value || null,
                            })
                          }
                          className="input w-full"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeExercise(di, ei)}
                        className="btn btn-ghost btn-sm"
                      >
                        Fjern
                      </button>
                    </div>

                    {/* Sets */}
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-[1.2rem_1fr_1fr_1fr_1fr_auto] gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint px-1">
                        <span>#</span>
                        <span>Reps</span>
                        <span>Kg</span>
                        <span>RPE</span>
                        <span>Hvile s</span>
                        <span />
                      </div>
                      {ex.sets.map((s, si) => (
                        <div
                          key={si}
                          className="grid grid-cols-[1.2rem_1fr_1fr_1fr_1fr_auto] gap-2 items-center"
                        >
                          <span className="numeric text-xs text-fg-faint">
                            {si + 1}
                          </span>
                          <input
                            type="number"
                            value={s.reps}
                            onChange={(e) =>
                              patchSet(di, ei, si, {
                                reps: parseInt(e.target.value, 10) || 0,
                              })
                            }
                            className="input w-full"
                          />
                          <input
                            type="number"
                            value={s.weight}
                            onChange={(e) =>
                              patchSet(di, ei, si, {
                                weight: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="input w-full"
                          />
                          <input
                            type="number"
                            step="0.5"
                            value={s.rpe ?? ""}
                            placeholder="—"
                            onChange={(e) =>
                              patchSet(di, ei, si, {
                                rpe: e.target.value
                                  ? parseFloat(e.target.value)
                                  : null,
                              })
                            }
                            className="input w-full"
                          />
                          <input
                            type="number"
                            value={s.rest_sec}
                            onChange={(e) =>
                              patchSet(di, ei, si, {
                                rest_sec: parseInt(e.target.value, 10) || 0,
                              })
                            }
                            className="input w-full"
                          />
                          <button
                            type="button"
                            onClick={() => removeSet(di, ei, si)}
                            className="text-fg-dim hover:text-fg text-lg leading-none px-1"
                            aria-label="Fjern sæt"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addSet(di, ei)}
                        className="text-[11px] font-mono uppercase tracking-[0.14em] text-fg-dim hover:text-fg pt-1"
                      >
                        + Sæt
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addExercise(di)}
                  disabled={library.length === 0}
                  className="btn btn-ghost btn-sm"
                >
                  + Tilføj øvelse
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      {/* Save bar */}
      <section className="surface-2 rounded-xl p-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? "Gemmer…" : "Gem program"}
        </button>
        {savedAt ? (
          <span className="text-[11px] font-mono text-fg-faint">
            Gemt {savedAt}
          </span>
        ) : null}
        {saveError ? (
          <span className="text-sm" style={{ color: "#C97B3E" }}>
            {saveError}
          </span>
        ) : null}
      </section>

      {/* Assign */}
      <AssignPanel
        programId={program.id}
        weeks={weeks}
        members={members}
        canAssign={isPublished && days.length > 0}
      />
    </div>
  );
}

function AssignPanel({
  programId,
  weeks,
  members,
  canAssign,
}: {
  programId: string;
  weeks: number;
  members: AssignableMember[];
  canAssign: boolean;
}) {
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [startWeek, setStartWeek] = useState(1);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function assign() {
    setResult(null);
    setError(null);
    const member = members.find((m) => m.id === memberId);
    if (!member) return;
    if (
      member.hasActiveProgram &&
      !confirm(
        `@${member.handle} har allerede et aktivt program. Det nuværende sættes til "afbrudt" og det nye overtager. Fortsæt?`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await assignProgramAction({ programId, memberId, startWeek });
      if (res.ok) {
        setResult(
          `${res.sessionsCreated ?? 0} sessioner genereret til @${member.handle}.`,
        );
      } else {
        setError(res.error ?? "Kunne ikke assigne");
      }
    });
  }

  return (
    <section className="surface-2 rounded-xl p-5 md:p-6 space-y-4">
      <div className="eyebrow">Publicér til medlem</div>
      {!canAssign ? (
        <p className="text-sm text-fg-dim">
          Markér programmet som publiceret og tilføj mindst én dag for at kunne
          assigne det.
        </p>
      ) : members.length === 0 ? (
        <p className="text-sm text-fg-dim">Ingen medlemmer at assigne til.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
            <label className="space-y-1.5">
              <span className="text-xs text-fg-dim">Medlem</span>
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="input w-full"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    @{m.handle}
                    {m.hasActiveProgram ? " · har aktivt program" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs text-fg-dim">Start-uge</span>
              <input
                type="number"
                min={1}
                max={weeks}
                value={startWeek}
                onChange={(e) =>
                  setStartWeek(parseInt(e.target.value, 10) || 1)
                }
                className="input w-full"
              />
            </label>
            <button
              type="button"
              onClick={assign}
              disabled={pending}
              className="btn btn-primary"
            >
              {pending ? "Genererer…" : "Assign + generér"}
            </button>
          </div>
          <p className="text-[11px] font-mono text-fg-faint">
            Genererer sessioner for uge {startWeek}–{weeks}. Gem programmet
            først, hvis du har lavet ændringer.
          </p>
          {result ? (
            <p className="text-sm text-fg">{result}</p>
          ) : null}
          {error ? (
            <p className="text-sm" style={{ color: "#C97B3E" }}>
              {error}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
