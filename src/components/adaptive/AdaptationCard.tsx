"use client";

import { useOptimistic, useTransition } from "react";

import {
  type ActiveAdaptation,
  describeAdaptation,
} from "@/lib/adaptive/explanation";
import { setAdaptationResponseAction } from "@/app/(app)/session/[id]/actions";

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
 * adds the interactive layer:
 *
 *   - "OK, kør tilpasset" sets accepted_by_member = true
 *   - "Behold original" sets accepted_by_member = false; the next
 *     server render passes the modifier through applyAdaptationToSession
 *     which short-circuits to the unmodified session
 *
 * Uses useOptimistic so the chosen state is reflected instantly. On
 * server failure (rare — service client + indexed update) we silently
 * revert and the buttons reappear; revalidatePath also re-runs
 * SessionClient so the session weights snap back to their pre-accept
 * shape when the member kept the original.
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

  if (!optimisticAdaptation) return null;

  const display = describeAdaptation(optimisticAdaptation);

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
