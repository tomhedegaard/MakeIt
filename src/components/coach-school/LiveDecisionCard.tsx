"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { submitLiveReviewAction } from "@/app/(app)/coach-school/actions";
import {
  COACH_DECISIONS,
  type CoachDecision,
} from "@/lib/coach-school/agreement";
import type { LiveCase } from "@/lib/data/coach-school";

/**
 * CC-5 — one live case the co-coach acts on directly. Unlike the
 * sandbox card, there's no hidden Munk decision: the co-coach's call
 * IS the decision. On submit the alert closes and the card replaces
 * itself with a stamped confirmation.
 */
const PILL_FOR_DECISION: Record<CoachDecision, string> = {
  approve: "bg-bg-3",
  modify: "bg-amber-700/30",
  escalate: "bg-amber-800/40",
  reject: "bg-red-900/40",
};

export default function LiveDecisionCard({ liveCase }: { liveCase: LiveCase }) {
  const t = useTranslations("CoachSchool");
  const [decision, setDecision] = useState<CoachDecision | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [sent, setSent] = useState<{ decision: CoachDecision; reasoning: string | null } | null>(null);
  const [heldReason, setHeldReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!decision) return;
    setError(null);
    setHeldReason(null);
    startTransition(async () => {
      const res = await submitLiveReviewAction({
        alertId: liveCase.alertId,
        decision,
        reasoning: reasoning.trim() || null,
      });
      if (!res.ok) {
        // CC-9: held-for-review takes a distinct branch so the UI shows
        // "Munk skal lige se den her først" rather than a raw error.
        if (res.held) {
          setHeldReason(res.holdReason ?? "held");
          return;
        }
        setError(res.reason ?? "unknown");
        return;
      }
      setSent({ decision, reasoning: reasoning.trim() || null });
    });
  }

  if (heldReason) {
    return (
      <div className="surface rounded-lg p-5 space-y-3" aria-live="polite">
        <div className="flex items-center justify-between gap-4">
          <div className="eyebrow">@{liveCase.memberHandle}</div>
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

  if (sent) {
    return (
      <div className="surface rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="eyebrow">@{liveCase.memberHandle}</div>
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-fg-faint">
            {t("live.closedFootnote")}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="eyebrow">{t("live.yourCall")}</span>
          <div
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${PILL_FOR_DECISION[sent.decision]}`}
          >
            {t(`decisions.${sent.decision}`)}
          </div>
        </div>
        {sent.reasoning ? (
          <div>
            <div className="eyebrow mb-1">{t("revealed.yourReasoning")}</div>
            <p className="text-sm text-fg/90 leading-snug">{sent.reasoning}</p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="surface rounded-lg p-5 space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <div className="eyebrow">@{liveCase.memberHandle}</div>
        <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-fg-faint">
          {t("triggeredAt", { time: liveCase.triggeredAt })}
        </div>
      </div>

      <div className="surface-2 rounded-md p-3 space-y-1">
        <div className="eyebrow mb-1">{t("conditionsHeader")}</div>
        <ul className="text-xs font-mono text-fg/90 space-y-0.5">
          {Object.entries(liveCase.conditionsMet).map(([k, v]) => (
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
        <div className="eyebrow">{t("live.decisionHeader")}</div>
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
                  name={`live-decision-${liveCase.alertId}`}
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
          placeholder={t("live.reasoningPlaceholder")}
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
        {pending ? t("submitting") : t("live.submitButton")}
      </button>
    </div>
  );
}
