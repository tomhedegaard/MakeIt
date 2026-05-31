"use client";

import Link from "next/link";
import { useTransition } from "react";

import { reviewAdaptiveAlertAction } from "@/app/coach/queue/actions";
import type { AdaptiveAlertRow } from "@/lib/data/coach";

/**
 * Coach-side card for an adaptive engine escalation awaiting Munk's
 * review. Renders the engine's proposed action, the member-facing
 * Danish explanation, and two one-way actions:
 *
 *   - "Godkend"   → reviewAdaptiveAlertAction({accepted: true}) →
 *                   modifier.reviewed_by='munk' → applyAdaptationToSession
 *                   transforms the session on the member's next render
 *   - "Afvis"     → reviewAdaptiveAlertAction({accepted: false}) →
 *                   modifier.reviewed_by='munk' AND accepted_by_member=false
 *                   → applyAdaptationToSession short-circuits, session
 *                   renders as originally planned
 *
 * Either way the alert closes from this queue. The member sees the
 * outcome via the AdaptationCard's attribution change.
 *
 * Mirrors HrvAlertCard's pattern: useTransition, monochrome chips, no
 * sheet (review is one-click). Single shared `[pending, ...]` disables
 * both buttons during any in-flight action.
 */
export default function AdaptiveAlertCard({
  alert,
}: {
  alert: AdaptiveAlertRow;
}) {
  const [pending, startTransition] = useTransition();

  function review(accepted: boolean) {
    startTransition(async () => {
      await reviewAdaptiveAlertAction({
        alertId: alert.alertId,
        modifierId: alert.modifierId,
        sessionId: alert.sessionId,
        accepted,
      });
    });
  }

  const actionLabel = ACTION_LABELS[alert.action];

  return (
    <div className="surface-2 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="min-w-0">
          <div className="text-sm">
            <Link
              href={`/coach/members/${alert.memberId}`}
              className="hover:underline"
            >
              @{alert.memberHandle}
            </Link>
          </div>
          <div className="text-[11px] font-mono text-fg-faint">
            {new Date(alert.triggeredAt).toLocaleString("da-DK", {
              hour: "2-digit",
              minute: "2-digit",
              day: "numeric",
              month: "short",
            })}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="eyebrow">Engine foreslår</div>
          <div className="text-sm font-mono">{actionLabel}</div>
        </div>
      </div>

      {/* Reason chips — what the engine saw. */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {alert.reasons.slice(0, 5).map((r) => (
          <span
            key={r}
            className="text-[10px] font-mono uppercase tracking-[0.12em] px-2 py-0.5 rounded-sm bg-bg-3 text-fg-dim"
          >
            {r}
          </span>
        ))}
        {alert.confidence !== null ? (
          <span className="text-[10px] font-mono tracking-[0.12em] text-fg-faint ml-auto">
            conf {alert.confidence.toFixed(2)}
          </span>
        ) : null}
      </div>

      {/* Member-facing copy — what they'd see if approved. */}
      {alert.explanationDa ? (
        <p className="text-fg/90 text-sm leading-relaxed mb-3 italic">
          “{alert.explanationDa}”
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
          Afventer review
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => review(false)}
            className="rounded-lg border hairline px-3 py-2 text-[12px] font-mono uppercase tracking-[0.12em] text-fg-dim lift touch-app disabled:opacity-60"
          >
            Afvis
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => review(true)}
            className="rounded-lg border hairline bg-bg-2 px-3 py-2 text-[12px] font-mono uppercase tracking-[0.12em] lift touch-app disabled:opacity-60"
          >
            Godkend
          </button>
        </div>
      </div>
    </div>
  );
}

const ACTION_LABELS: Record<AdaptiveAlertRow["action"], string> = {
  paused_session: "Pause i dag",
  deload_week_insertion: "Deload-uge",
  escalate_to_coach: "Eskalering",
  top_set_reduction: "Reducér topsæt",
  volume_reduction: "Reducér volumen",
  exercise_swap_variant: "Byt øvelse",
  session_shorten: "Afkort session",
};
