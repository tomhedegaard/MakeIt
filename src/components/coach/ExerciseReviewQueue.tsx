"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { setExercisePublishedAction } from "@/app/coach/exercises/actions";
import { resolveDemoAssets } from "@/lib/data/demo-assets";
import type { Exercise } from "@/lib/data/exercises";
import { MUSCLE_LABELS } from "@/lib/data/muscle-groups";
import { initialQueue, keyToAction, queueReducer, tally, type QueueAction } from "@/lib/coach/review-queue";
import { cn } from "@/lib/utils";

/**
 * One draft at a time: the loop, the name, the muscles and the coaching
 * text, with Approve (publishes now) and Skip. Keyboard first, so a
 * library of drafts takes minutes, not an afternoon. Nothing is decided
 * in bulk: every exercise that goes live was on screen when it was
 * approved.
 */
export default function ExerciseReviewQueue({ drafts: initialDrafts }: { drafts: Exercise[] }) {
  const t = useTranslations("CoachStudio.exercises.review");
  // Frozen at mount: publishing revalidates the library, and a fresh
  // list without the approved draft would shift every position by one.
  const [drafts] = useState(initialDrafts);
  const count = drafts.length;
  const [state, dispatch] = useReducer(
    (s: ReturnType<typeof initialQueue>, a: QueueAction) => queueReducer(s, a, count),
    undefined,
    initialQueue,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = drafts[state.index] ?? null;
  const decision = current ? state.decisions[current.id] : undefined;
  const { approved, skipped } = tally(state.decisions);

  const approve = useCallback(async () => {
    if (!current || saving) return;
    if (decision === "approved") {
      dispatch({ type: "forward" });
      return;
    }
    setSaving(true);
    setError(null);
    const res = await setExercisePublishedAction({ id: current.id, slug: current.slug, published: true });
    setSaving(false);
    if (!res.ok) {
      setError(t("error", { message: res.error ?? "" }));
      return;
    }
    dispatch({ type: "approve", id: current.id });
  }, [current, decision, saving, t]);

  const skip = useCallback(() => {
    if (!current || saving) return;
    setError(null);
    if (decision === "approved") dispatch({ type: "forward" });
    else dispatch({ type: "skip", id: current.id });
  }, [current, decision, saving]);

  const undo = useCallback(async () => {
    if (!current || saving) return;
    setSaving(true);
    setError(null);
    const res = await setExercisePublishedAction({ id: current.id, slug: current.slug, published: false });
    setSaving(false);
    if (!res.ok) {
      setError(t("error", { message: res.error ?? "" }));
      return;
    }
    dispatch({ type: "undo", id: current.id });
  }, [current, saving, t]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      const action = keyToAction(e.key);
      if (!action) return;
      // Enter on a focused button already clicks it.
      if (e.key === "Enter" && target?.closest("button, a")) return;
      e.preventDefault();
      if (action === "approve") void approve();
      else if (action === "skip") skip();
      else dispatch({ type: "back" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [approve, skip]);

  if (count === 0) return <p className="text-fg-dim text-sm">{t("empty")}</p>;

  if (!current) {
    return (
      <section className="surface-2 rounded-xl border hairline p-6 md:p-8 space-y-4">
        <h2 className="font-display text-3xl">{t("doneTitle")}</h2>
        <p className="text-fg-dim">{t("doneBody", { approved, skipped })}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/coach/exercises" className="btn btn-primary">
            {t("back")}
          </Link>
          <button type="button" onClick={() => location.reload()} className="btn">
            {t("again")}
          </button>
        </div>
      </section>
    );
  }

  const demo = current.demoAssetUrl ? resolveDemoAssets(current.demoAssetUrl) : null;
  const meta = [current.category, current.equipment, current.difficulty].filter(Boolean).join(" · ");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="font-mono text-[12px] uppercase tracking-[0.1em] text-fg-dim">
          {t("position", { current: state.index + 1, total: count })}
        </p>
        <p className="font-mono text-[12px] text-fg-dim" aria-live="polite">
          {t("tally", { approved, skipped })}
        </p>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-bg-3" aria-hidden="true">
        <i className="block h-full bg-signal transition-[width]" style={{ width: `${(state.index / count) * 100}%` }} />
      </div>

      <article className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]" aria-labelledby="review-name">
        <div className="overflow-hidden rounded-xl border hairline bg-bg-2">
          {demo ? (
            <video
              key={current.id}
              autoPlay
              muted
              loop
              playsInline
              poster={demo.poster}
              aria-label={current.name}
              className="block aspect-[1300/720] w-full object-contain bg-bg-3"
            >
              <source src={demo.webm} type="video/webm" />
              <source src={demo.mp4} type="video/mp4" />
            </video>
          ) : (
            <div className="grid aspect-[1300/720] place-items-center text-fg-dim text-sm">{t("noVideo")}</div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <p className="font-mono text-[11px] text-fg-faint">{current.slug}</p>
            <h2 id="review-name" className="font-display text-[clamp(1.8rem,4vw,2.6rem)] leading-[0.95]">
              {current.name}
            </h2>
            {meta ? <p className="mt-1.5 text-sm text-fg-dim">{meta}</p> : null}
            {decision ? (
              <p className={cn("mt-2 text-sm", decision === "approved" ? "text-fg" : "text-fg-dim")}>
                {t(decision)}
              </p>
            ) : null}
          </div>

          <MuscleRow label={t("primary")} muscles={current.primaryMuscles} strong />
          <MuscleRow label={t("secondary")} muscles={current.secondaryMuscles} />

          {current.cues.length ? (
            <Block label={t("cues")}>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {current.cues.map((cue) => (
                  <li key={cue}>{cue}</li>
                ))}
              </ul>
            </Block>
          ) : null}
          {current.mistakes.length ? (
            <Block label={t("mistakes")}>
              <ul className="space-y-2 text-sm">
                {current.mistakes.map((m) => (
                  <li key={m.title}>
                    <b className="font-medium">{m.title}.</b> <span className="text-fg-dim">{m.body}</span>
                  </li>
                ))}
              </ul>
            </Block>
          ) : null}
          {current.whyMatters ? (
            <Block label={t("why")}>
              <p className="text-sm text-fg-dim">{current.whyMatters}</p>
            </Block>
          ) : null}
          {current.setup ? (
            <Block label={t("setup")}>
              <p className="text-sm text-fg-dim">{current.setup}</p>
            </Block>
          ) : null}
        </div>
      </article>

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 border-t hairline bg-bg/95 px-1 py-4 backdrop-blur">
        <button type="button" onClick={() => void approve()} disabled={saving} className="btn btn-primary h-12! px-6!">
          {saving ? t("saving") : t("approve")}
        </button>
        <button type="button" onClick={skip} disabled={saving} className="btn h-12! px-5!">
          {t("skip")}
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "back" })}
          disabled={saving || state.index === 0}
          className="btn h-12! px-5! disabled:opacity-40"
        >
          {t("previous")}
        </button>
        {decision === "approved" ? (
          <button type="button" onClick={() => void undo()} disabled={saving} className="btn h-12! px-5!">
            {t("undo")}
          </button>
        ) : null}
        <Link
          href={`/coach/exercises/${encodeURIComponent(current.slug)}`}
          className="ml-auto text-sm text-fg-dim underline underline-offset-4"
        >
          {t("edit")}
        </Link>
        {error ? (
          <p role="alert" className="w-full text-sm text-danger">
            {error}
          </p>
        ) : null}
        <p className="w-full font-mono text-[11px] text-fg-faint">{t("keys")}</p>
      </div>
    </div>
  );
}

function MuscleRow({ label, muscles, strong = false }: { label: string; muscles: string[]; strong?: boolean }) {
  if (muscles.length === 0) return null;
  return (
    <Block label={label}>
      <div className="flex flex-wrap gap-1.5">
        {muscles.map((m) => (
          <span
            key={m}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs",
              strong ? "border-fg text-fg" : "hairline text-fg-dim",
            )}
          >
            {MUSCLE_LABELS[m as keyof typeof MUSCLE_LABELS] ?? m}
          </span>
        ))}
      </div>
    </Block>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-fg-faint">{label}</p>
      {children}
    </div>
  );
}
