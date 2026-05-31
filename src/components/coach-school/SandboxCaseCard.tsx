"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { submitSandboxReviewAction } from "@/app/(app)/coach-school/actions";
import {
  COACH_DECISIONS,
  type CoachDecision,
} from "@/lib/coach-school/agreement";
import type { SandboxCase } from "@/lib/data/coach-school";

/**
 * CC-4 — one sandbox case card. Beast picks a decision, optionally
 * writes reasoning, submits. Server action computes agreement against
 * Munk's derived decision; on success the card replaces itself with
 * a side-by-side comparison + score (the "reveal").
 *
 * Demo-mode caveat: the server action returns {agreementScore: 1.0,
 * munkDecision: beastDecision} optimistically in demo mode (no DB to
 * read from). To keep the reveal honest in demo, we compute the score
 * client-side against the mock's pre-baked munkDecisionHidden value
 * instead of trusting the action's return when demo signals it.
 */
const PILL_FOR_DECISION: Record<CoachDecision, string> = {
  approve: "bg-bg-3",
  modify: "bg-amber-700/30",
  escalate: "bg-amber-800/40",
  reject: "bg-red-900/40",
};

export default function SandboxCaseCard({
  sandboxCase,
  isDemo,
}: {
  sandboxCase: SandboxCase;
  isDemo: boolean;
}) {
  const t = useTranslations("CoachSchool");
  const [decision, setDecision] = useState<CoachDecision | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [revealed, setRevealed] = useState<{
    score: number;
    munk: CoachDecision;
    beast: CoachDecision;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heldReason, setHeldReason] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!decision) return;
    setError(null);
    setHeldReason(null);
    startTransition(async () => {
      const res = await submitSandboxReviewAction({
        alertId: sandboxCase.alertId,
        decision,
        reasoning: reasoning.trim() || null,
      });
      if (!res.ok) {
        // CC-9: safety pipeline held the message — surface a friendly
        // "Munk skal lige se den her først" instead of a generic error.
        if (res.held) {
          setHeldReason(res.holdReason ?? "held");
          return;
        }
        setError(res.reason ?? "unknown");
        return;
      }
      // Demo mode returns an optimistic 1.0 score — override with the
      // mock's pre-baked Munk decision so the reveal stays honest.
      const munk = isDemo
        ? sandboxCase.munkDecisionHidden
        : (res.munkDecision ?? sandboxCase.munkDecisionHidden);
      const score = isDemo
        ? scoreFor(decision, munk)
        : (res.agreementScore ?? scoreFor(decision, munk));
      setRevealed({ score, munk, beast: decision });
    });
  }

  if (heldReason) {
    return (
      <div className="surface rounded-lg p-5 space-y-3" aria-live="polite">
        <div className="flex items-center justify-between gap-4">
          <div className="eyebrow">@{sandboxCase.memberHandle}</div>
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-amber-400">
            {t("held.badge")}
          </div>
        </div>
        <p className="text-sm text-fg/90 leading-snug">
          {t("held.title")}
        </p>
        <p className="text-xs font-mono text-fg-faint">
          {t("held.reasonLine", { reason: heldReason })}
        </p>
      </div>
    );
  }

  if (revealed) {
    return (
      <div className="surface rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="eyebrow mb-1">@{sandboxCase.memberHandle}</div>
            <div className="text-xs font-mono text-fg-faint">
              {t("revealed.triggeredAt", { time: sandboxCase.triggeredAt })}
            </div>
          </div>
          <div className="numeric text-3xl">
            {Math.round(revealed.score * 100)}%
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="surface-2 rounded-md p-3">
            <div className="eyebrow mb-1">{t("revealed.youHeader")}</div>
            <div
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${PILL_FOR_DECISION[revealed.beast]}`}
            >
              {t(`decisions.${revealed.beast}`)}
            </div>
          </div>
          <div className="surface-2 rounded-md p-3">
            <div className="eyebrow mb-1">{t("revealed.munkHeader")}</div>
            <div
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${PILL_FOR_DECISION[revealed.munk]}`}
            >
              {t(`decisions.${revealed.munk}`)}
            </div>
          </div>
        </div>
        {reasoning ? (
          <div>
            <div className="eyebrow mb-1">{t("revealed.yourReasoning")}</div>
            <p className="text-sm text-fg/90 leading-snug">{reasoning}</p>
          </div>
        ) : null}
        <p className="text-xs font-mono text-fg-faint">
          {t("revealed.footnote")}
        </p>
      </div>
    );
  }

  return (
    <div className="surface rounded-lg p-5 space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <div className="eyebrow">@{sandboxCase.memberHandle}</div>
        <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-fg-faint">
          {t("triggeredAt", { time: sandboxCase.triggeredAt })}
        </div>
      </div>

      <div className="surface-2 rounded-md p-3 space-y-1">
        <div className="eyebrow mb-1">{t("conditionsHeader")}</div>
        <ul className="text-xs font-mono text-fg/90 space-y-0.5">
          {Object.entries(sandboxCase.conditionsMet).map(([k, v]) => (
            <li key={k}>
              <span className="text-fg-faint">{k}:</span> {String(v)}
            </li>
          ))}
        </ul>
      </div>

      <fieldset
        className="space-y-2"
        aria-label={t("decisionFieldsetLabel")}
      >
        <div className="eyebrow">{t("decisionHeader")}</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {COACH_DECISIONS.map((d) => {
            const active = decision === d;
            return (
              <label
                key={d}
                className={`btn btn-sm flex items-center gap-2 cursor-pointer ${active ? "btn-primary" : ""}`}
              >
                <input
                  type="radio"
                  name={`decision-${sandboxCase.alertId}`}
                  value={d}
                  checked={active}
                  onChange={() => setDecision(d)}
                  className="sr-only"
                />
                <span>{t(`decisions.${d}`)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="block">
        <span className="eyebrow block mb-2">{t("reasoningLabel")}</span>
        <textarea
          className="field min-h-[72px] py-2 resize-none w-full text-sm"
          placeholder={t("reasoningPlaceholder")}
          value={reasoning}
          onChange={(e) => setReasoning(e.target.value)}
          maxLength={1000}
        />
      </label>

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
        disabled={pending || !decision}
      >
        {pending ? t("submitting") : t("submitButton")}
      </button>
    </div>
  );
}

/**
 * Mirrors lib/coach-school/agreement's scoring matrix locally so the
 * client can re-compute in demo mode without importing the server-only
 * scorer. The matrix is small; trivial to keep aligned. The pure
 * server-side scorer remains the source of truth for non-demo writes.
 */
function scoreFor(beast: CoachDecision, munk: CoachDecision): number {
  if (beast === munk) return 1.0;
  const ladder: CoachDecision[] = ["approve", "modify", "escalate", "reject"];
  const gap = Math.abs(ladder.indexOf(beast) - ladder.indexOf(munk));
  if (gap === 1) return 0.5;
  if (gap === 2) return 0.25;
  return 0.0;
}
