"use client";

import { useOptimistic, useRef, useTransition, type SyntheticEvent } from "react";

import ReasoningDetailPanel from "@/components/adaptive/ReasoningDetailPanel";
import { hydrateEngineInputFromSnapshot } from "@/lib/adaptive/snapshot";
import {
  type ActiveAdaptation,
  describeAdaptation,
} from "@/lib/adaptive/explanation";
import type { AdaptiveActionParams, RuleReasonCode } from "@/lib/adaptive/types";
import {
  markReasoningRevealedAction,
  setAdaptationResponseAction,
} from "@/app/(app)/session/[id]/actions";

type Props = {
  adaptation: ActiveAdaptation | null;
  sessionId: string;
};

/**
 * Member-facing card for the active session adaptation. Renders above
 * the first exercise on /session/[id] when the daily adaptive cron has
 * persisted an `adaptive_v0` hrv_session_modifiers row for this session.
 *
 * Labels + state-shaping come from `describeAdaptation` in
 * `@/lib/adaptive/explanation` (pure, unit-tested). This component
 * adds two interactive layers:
 *
 *   1. Accept / keep-original CTAs (Søjle 1 F):
 *      - "OK, kør tilpasset" → accepted_by_member = true
 *      - "Behold original"   → accepted_by_member = false; the next
 *        server render passes the modifier through
 *        applyAdaptationToSession which short-circuits to the
 *        unmodified session.
 *      Uses useOptimistic so the chosen state is reflected instantly.
 *
 *   2. "Vis tankegang" disclosure (Søjle 2 OB-4):
 *      Native <details> element — browser owns the open state, zero
 *      JS state per spec §4. onToggle fires markReasoningRevealedAction
 *      the first time the member opens it (and only the first time —
 *      guarded by a ref + the server's idempotent IS NULL filter).
 *      Mounted only when the underlying reasoning context is present
 *      (input_snapshot + rule_decision were persisted); demo mode and
 *      older rows without those fields just don't show the disclosure.
 *
 * Renders null for null adaptation so callers can include it
 * unconditionally — same shape as HrvReadinessNudge.
 */
export default function AdaptationCard({ adaptation, sessionId }: Props) {
  const [optimisticAdaptation, applyOptimistic] = useOptimistic<
    ActiveAdaptation | null,
    boolean
  >(adaptation, (current, accepted) =>
    current ? { ...current, acceptedByMember: accepted } : current
  );
  const [isPending, startTransition] = useTransition();
  // Tracks whether we've fired the reveal telemetry during THIS browser
  // session. Initialised from the server's stored timestamp so a member
  // who already revealed in an earlier session doesn't re-fire on the
  // first toggle of a fresh visit.
  const hasFiredRevealRef = useRef<boolean>(
    Boolean(adaptation?.reasoningRevealedAt)
  );

  if (!optimisticAdaptation) return null;

  const display = describeAdaptation(optimisticAdaptation);
  const reasoningPanel = buildReasoningPanel(optimisticAdaptation);

  function respond(accepted: boolean) {
    startTransition(async () => {
      applyOptimistic(accepted);
      await setAdaptationResponseAction({
        modifierId: optimisticAdaptation!.modifierId,
        sessionId,
        accepted,
      });
    });
  }

  function handleDisclosureToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    // Only act on open → fire-once. Server is idempotent (IS NULL guard)
    // but we still gate client-side to avoid wasted round-trips when
    // member toggles back-and-forth.
    if (!event.currentTarget.open || hasFiredRevealRef.current) return;
    hasFiredRevealRef.current = true;
    startTransition(async () => {
      await markReasoningRevealedAction({
        modifierId: optimisticAdaptation!.modifierId,
      });
    });
  }

  return (
    <section
      aria-labelledby="adaptation-heading"
      className="surface-2 rounded-2xl p-5 lg:p-6 space-y-3"
      aria-busy={isPending}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="adaptation-heading" className="eyebrow">
          {display.eyebrow}
        </h2>
        <span
          className={`text-[10px] font-mono uppercase tracking-[0.14em] ${
            display.pendingCoach ? "text-warn" : "text-fg-dim"
          }`}
        >
          {display.attribution}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-fg-dim">
        {optimisticAdaptation.explanationDa}
      </p>

      {reasoningPanel ? (
        <details
          className="group"
          onToggle={handleDisclosureToggle}
        >
          <summary className="cursor-pointer list-none text-[11px] font-mono uppercase tracking-[0.14em] text-fg-dim hover:text-fg select-none inline-flex items-center gap-1 lift touch-app">
            <span>Vis tankegang</span>
            <span aria-hidden className="group-open:rotate-180 transition-transform">↓</span>
          </summary>
          {reasoningPanel}
        </details>
      ) : null}

      {display.showAcceptCTA ? (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={isPending}
            onClick={() => respond(true)}
            className="flex-1 rounded-lg border hairline bg-bg-2 px-3 py-2 text-[12px] font-mono uppercase tracking-[0.12em] lift touch-app disabled:opacity-60"
          >
            OK, kør tilpasset
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => respond(false)}
            className="flex-1 rounded-lg border hairline px-3 py-2 text-[12px] font-mono uppercase tracking-[0.12em] text-fg-dim lift touch-app disabled:opacity-60"
          >
            Behold original
          </button>
        </div>
      ) : optimisticAdaptation.acceptedByMember === false ? (
        <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint pt-1">
          Du valgte at beholde den originale session
        </div>
      ) : null}
    </section>
  );
}

/**
 * Assemble the ReasoningDetailPanel from the optional reasoning fields
 * on ActiveAdaptation. Returns null when the underlying data isn't
 * present (demo mode, older rows persisted before Søjle 2's data
 * additions, or the data layer didn't fetch it for some reason) —
 * caller hides the disclosure entirely in that case.
 */
function buildReasoningPanel(adaptation: ActiveAdaptation) {
  if (!adaptation.ruleDecision || !adaptation.createdAt) return null;
  const signals = hydrateEngineInputFromSnapshot(
    adaptation.inputSnapshot ?? null,
    new Date(adaptation.createdAt)
  );
  return (
    <ReasoningDetailPanel
      signals={signals}
      ruleDecision={{
        action: adaptation.ruleDecision.action,
        // Reasons are stored as plain strings in jsonb; cast to the
        // narrowed union for display. Unknown codes fall through to
        // labelForReason's raw-string fallback (intentional).
        reasons: adaptation.ruleDecision.reasons as RuleReasonCode[],
        confidence: adaptation.ruleDecision.confidence,
        params: adaptation.ruleDecision.params as AdaptiveActionParams,
      }}
      reasoningOutput={adaptation.reasoningOutput ?? null}
      recentFormCheckCount={adaptation.recentFormCheckCount ?? 0}
    />
  );
}
