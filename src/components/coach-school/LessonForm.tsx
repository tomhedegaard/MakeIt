"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { submitLessonAction } from "@/app/(app)/coach-school/actions";
import type { LessonDetail } from "@/lib/data/lessons";

/**
 * CC-6 — quiz + practice scenario form for a single lesson.
 *
 * Renders the 3-question quiz with radio choices, then (if the lesson
 * has a practice_scenario) a free-text prompt below. On submit, the
 * server grades the quiz, calls Claude to evaluate the practice
 * response, and saves lesson_progress. The card replaces itself with
 * the result reveal — quiz score, Claude's score chip, and the
 * Danish feedback verbatim.
 */
type EvalScore = "needs_work" | "on_track" | "strong";

const SCORE_PILL: Record<EvalScore, string> = {
  needs_work: "bg-red-900/40",
  on_track: "bg-amber-700/30",
  strong: "bg-bg-3",
};

interface Result {
  quizScore: number;
  practiceEvalScore: EvalScore | null;
  practiceFeedback: string | null;
}

export default function LessonForm({ lesson }: { lesson: LessonDetail }) {
  const t = useTranslations("CoachSchool");
  const [answers, setAnswers] = useState<(number | null)[]>(
    lesson.quiz.map(() => null),
  );
  const [practiceResponse, setPracticeResponse] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allAnswered = answers.every((a) => a !== null);
  const practiceRequiredButEmpty =
    !!lesson.practiceScenario && practiceResponse.trim().length === 0;
  const canSubmit = allAnswered && !practiceRequiredButEmpty && !pending;

  function setAnswer(qIdx: number, choiceIdx: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIdx] = choiceIdx;
      return next;
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitLessonAction({
        slug: lesson.slug,
        quizAnswers: answers.map((a) => a ?? -1),
        practiceResponse: practiceResponse.trim() || null,
      });
      if (!res.ok) {
        setError(res.reason ?? "unknown");
        return;
      }
      setResult({
        quizScore: res.quizScore ?? 0,
        practiceEvalScore: res.practiceEvalScore ?? null,
        practiceFeedback: res.practiceFeedback ?? null,
      });
    });
  }

  if (result) {
    return (
      <div className="surface rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="eyebrow">{t("lesson.resultHeader")}</div>
          <div className="numeric text-3xl">
            {Math.round(result.quizScore * 100)}%
          </div>
        </div>
        <p className="text-sm text-fg-dim">
          {t("lesson.quizResultLine", {
            correct: Math.round(result.quizScore * lesson.quiz.length),
            total: lesson.quiz.length,
          })}
        </p>

        {result.practiceEvalScore ? (
          <div className="surface-2 rounded-md p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="eyebrow">{t("lesson.evalHeader")}</span>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${SCORE_PILL[result.practiceEvalScore]}`}
              >
                {t(`lesson.evalScore.${result.practiceEvalScore}`)}
              </span>
            </div>
            {result.practiceFeedback ? (
              <p className="text-sm text-fg/90 leading-snug">
                {result.practiceFeedback}
              </p>
            ) : null}
          </div>
        ) : lesson.practiceScenario ? (
          <p className="text-xs font-mono text-fg-faint">
            {t("lesson.evalUnavailable")}
          </p>
        ) : null}

        <p className="text-xs font-mono text-fg-faint">
          {t("lesson.completedFootnote", { reps: lesson.repsAward })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quiz */}
      <section className="space-y-4">
        <div className="eyebrow">{t("lesson.quizHeader")}</div>
        <ol className="space-y-4 list-none">
          {lesson.quiz.map((q, qIdx) => (
            <li key={qIdx} className="surface rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="numeric text-2xl text-fg-faint shrink-0 leading-none">
                  {String(qIdx + 1).padStart(2, "0")}
                </span>
                <p className="text-sm text-fg/90 leading-relaxed flex-1">
                  {q.question}
                </p>
              </div>
              <fieldset
                className="space-y-2 pl-8"
                aria-label={t("lesson.quizQuestionLabel", { n: qIdx + 1 })}
              >
                {q.choices.map((choice, cIdx) => {
                  const active = answers[qIdx] === cIdx;
                  return (
                    <label
                      key={cIdx}
                      className={`btn btn-sm w-full justify-start cursor-pointer ${active ? "btn-primary" : ""}`}
                    >
                      <input
                        type="radio"
                        name={`q-${qIdx}`}
                        value={cIdx}
                        checked={active}
                        onChange={() => setAnswer(qIdx, cIdx)}
                        className="sr-only"
                      />
                      <span>{choice}</span>
                    </label>
                  );
                })}
              </fieldset>
            </li>
          ))}
        </ol>
      </section>

      {/* Practice scenario */}
      {lesson.practiceScenario ? (
        <section className="space-y-3">
          <div className="eyebrow">{t("lesson.practiceHeader")}</div>
          <div className="surface rounded-lg p-4 space-y-3">
            {lesson.practiceScenario.context ? (
              <p className="text-xs font-mono text-fg-faint">
                {lesson.practiceScenario.context}
              </p>
            ) : null}
            <p className="text-sm text-fg/90 leading-relaxed">
              {lesson.practiceScenario.prompt}
            </p>
            <textarea
              className="field min-h-[120px] py-3 resize-none w-full text-sm"
              placeholder={t("lesson.practicePlaceholder")}
              value={practiceResponse}
              onChange={(e) => setPracticeResponse(e.target.value)}
              maxLength={1000}
            />
          </div>
        </section>
      ) : null}

      {error ? (
        <p
          className="text-xs font-mono text-red-400"
          role="alert"
          aria-live="polite"
        >
          {t("errorLine", { reason: error })}
        </p>
      ) : null}

      <button
        type="button"
        className="btn btn-primary w-full sm:w-auto"
        onClick={submit}
        disabled={!canSubmit}
      >
        {pending ? t("submitting") : t("lesson.submitButton")}
      </button>
    </div>
  );
}
