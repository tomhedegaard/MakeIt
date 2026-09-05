"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("CoachStudio.programBuilder");
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
        dayLabel: t("newDayLabel", {
          letter: String.fromCharCode(65 + prev.length),
        }),
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
        setSaveError(res.error ?? t("saveError"));
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
            {t("breadcrumb")}
          </Link>
          <span aria-hidden>·</span>
          <span className="numeric">{program.code}</span>
        </div>
        <h1 className="font-display text-[clamp(2rem,5vw,3rem)] leading-[0.95]">
          {name || t("untitled")}.
        </h1>
        <p className="mt-2 text-fg-dim text-sm">
          {days.length === 1
            ? t("summaryDaysOne", { count: days.length })
            : t("summaryDaysOther", { count: days.length })}{" "}
          · {t("summarySuffix", { exercises: totalExercises, weeks })}
        </p>
      </header>

      {/* Program meta */}
      <section className="surface-2 rounded-xl p-5 md:p-6 space-y-4">
        <div className="eyebrow">{t("program")}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs text-fg-dim">{t("nameLabel")}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
              maxLength={80}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-fg-dim">{t("typeLabel")}</span>
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
            <span className="text-xs text-fg-dim">{t("levelLabel")}</span>
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
            <span className="text-xs text-fg-dim">{t("weeksLabel")}</span>
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
            <span className="text-xs text-fg-dim">{t("descriptionLabel")}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="input w-full"
              placeholder={t("descriptionPlaceholder")}
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPublished}
            disabled={days.length === 0 && !isPublished}
            onChange={(e) => {
              if (e.target.checked && days.length === 0) return;
              setIsPublished(e.target.checked);
            }}
          />
          <span>{t("publishedToggle")}</span>
        </label>
        {days.length === 0 ? (
          <p className="text-[11px] font-mono text-fg-dim">
            {t("publishNeedsDays")}
          </p>
        ) : null}
      </section>

      {/* Days */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="eyebrow">{t("days")}</div>
          <button type="button" onClick={addDay} className="btn btn-sm">
            {t("addDay")}
          </button>
        </div>

        {days.length === 0 ? (
          <p className="text-fg-dim text-sm">
            {t("daysEmpty")}
          </p>
        ) : (
          days.map((day, di) => (
            <article key={day.key} className="surface-2 rounded-xl p-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-[120px_1fr_120px_auto] sm:items-end">
                <label className="space-y-1.5">
                  <span className="text-xs text-fg-dim">{t("dayLabelLabel")}</span>
                  <input
                    value={day.dayLabel}
                    onChange={(e) => patchDay(di, { dayLabel: e.target.value })}
                    className="input w-full"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs text-fg-dim">{t("dayTitleLabel")}</span>
                  <input
                    value={day.title}
                    onChange={(e) => patchDay(di, { title: e.target.value })}
                    placeholder={t("dayTitlePlaceholder")}
                    className="input w-full"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs text-fg-dim">{t("dayEstLabel")}</span>
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
                  {t("deleteDay")}
                </button>
              </div>

              {/* Exercises */}
              <div className="space-y-3 border-t hairline pt-4">
                {day.exercises.map((ex, ei) => (
                  <div key={ex.key} className="surface rounded-lg p-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                      <label className="space-y-1.5">
                        <span className="text-xs text-fg-dim">{t("exerciseLabel")}</span>
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
                            <option value="">{t("libraryEmpty")}</option>
                          ) : null}
                          {library.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs text-fg-dim">{t("cueLabel")}</span>
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
                        {t("removeExercise")}
                      </button>
                    </div>

                    {/* Sets */}
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-[1.2rem_1fr_1fr_1fr_1fr_auto] gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint px-1">
                        <span>{t("setsColIndex")}</span>
                        <span>{t("setsColReps")}</span>
                        <span>{t("setsColKg")}</span>
                        <span>{t("setsColRpe")}</span>
                        <span>{t("setsColRest")}</span>
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
                            aria-label={t("removeSetAria")}
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
                        {t("addSet")}
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
                  {t("addExercise")}
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
          {saving ? t("saving") : t("save")}
        </button>
        {savedAt ? (
          <span className="text-[11px] font-mono text-fg-faint">
            {t("savedAt", { time: savedAt })}
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
  const t = useTranslations("CoachStudio.programBuilder");
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
      !confirm(t("assignConfirm", { handle: member.handle }))
    ) {
      return;
    }
    startTransition(async () => {
      const res = await assignProgramAction({ programId, memberId, startWeek });
      if (res.ok) {
        setResult(
          t("assignResult", {
            count: res.sessionsCreated ?? 0,
            handle: member.handle,
          }),
        );
      } else {
        setError(res.error ?? t("assignError"));
      }
    });
  }

  return (
    <section className="surface-2 rounded-xl p-5 md:p-6 space-y-4">
      <div className="eyebrow">{t("assignHeading")}</div>
      {!canAssign ? (
        <p className="text-sm text-fg-dim">
          {t("assignBlocked")}
        </p>
      ) : members.length === 0 ? (
        <p className="text-sm text-fg-dim">{t("assignNoMembers")}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
            <label className="space-y-1.5">
              <span className="text-xs text-fg-dim">{t("memberLabel")}</span>
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="input w-full"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.hasActiveProgram
                      ? t("memberHasActive", { handle: m.handle })
                      : `@${m.handle}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs text-fg-dim">{t("startWeekLabel")}</span>
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
              {pending ? t("generating") : t("assignButton")}
            </button>
          </div>
          <p className="text-[11px] font-mono text-fg-faint">
            {t("assignNote", { start: startWeek, end: weeks })}
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
