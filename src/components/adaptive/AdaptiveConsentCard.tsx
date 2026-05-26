"use client";

import { useState, useTransition } from "react";

import { enableAdaptiveEngineAction } from "@/app/(app)/hrv/actions";

type Props = {
  /**
   * Whether the card should render at all. The data layer
   * (getAdaptiveConsentEligibility) computes this: warmUpState='active'
   * + has active wearable connection + adaptive_program_enabled is
   * currently false. Renders null for `false` so callers can include
   * the card unconditionally on /hrv.
   */
  eligible: boolean;
};

/**
 * One-time consent surface for opting into the Adaptive Program
 * Engine. Renders on /hrv once the member's baseline is mature and
 * they have an active wearable connection but the flag is still off.
 * Disappears the moment the flag flips (or the member's connection
 * goes inactive) — no separate dismiss tracking.
 *
 * Honest copy:
 *   - What the engine sees (HRV, lifestyle, last sessions, form-checks)
 *   - What it can do (reduce top set, mark accessory sets optional,
 *     suggest swap, escalate to Munk)
 *   - What it CANNOT do without Munk (pause day, deload week)
 *   - That the member can always override per-session
 *
 * Optimistic UI: button disappears immediately on click; if the
 * server action fails the card reappears on the next render (no
 * client-side rollback — the server is the source of truth).
 */
export default function AdaptiveConsentCard({ eligible }: Props) {
  const [enabledOptimistic, setEnabledOptimistic] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!eligible || enabledOptimistic) return null;

  function enable() {
    setEnabledOptimistic(true);
    startTransition(async () => {
      const result = await enableAdaptiveEngineAction();
      if (!result.ok) {
        // Roll back the optimistic flip — revalidatePath will also
        // re-fetch eligible status on next navigation.
        setEnabledOptimistic(false);
      }
    });
  }

  return (
    <section
      aria-labelledby="adaptive-consent-heading"
      className="surface-2 rounded-2xl p-6 lg:p-7 space-y-4 border hairline"
    >
      <div>
        <div className="eyebrow mb-2">Nyt for dig</div>
        <h2
          id="adaptive-consent-heading"
          className="font-display text-2xl leading-tight"
        >
          Din baseline er klar — vil du have din session tilpasset hver dag?
        </h2>
      </div>

      <div className="text-sm text-fg-dim leading-relaxed space-y-3">
        <p>
          Vi kan nu justere dagens session ud fra din HRV, din søvn, sidste
          sessions RPE og de form-checks Munk har set. Eksempel: lav HRV +
          kort søvn → topsæt-vægten reduceres 10% i dag.
        </p>
        <p>
          <strong className="text-fg">Hvad motoren må selv:</strong> reducere
          topsæt-vægten, markere accessory-sæt som valgfri, foreslå en lettere
          variant af hovedløftet.
        </p>
        <p>
          <strong className="text-fg">Hvad Munk skal godkende:</strong> at
          pause en dag helt, eller indlægge en deload-uge. Du hører fra ham
          før det sker.
        </p>
        <p>
          Du kan altid sige &ldquo;behold original&rdquo; i sessionen og køre
          det planlagte program. Ingenting sker bag din ryg.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <button
          type="button"
          disabled={pending}
          onClick={enable}
          className="flex-1 rounded-lg border hairline bg-fg text-bg px-4 py-3 text-[12px] font-mono uppercase tracking-[0.12em] lift touch-app disabled:opacity-60"
        >
          Slå adaptiv tilpasning til
        </button>
      </div>
    </section>
  );
}
