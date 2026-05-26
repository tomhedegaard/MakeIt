import {
  type ActiveAdaptation,
  describeAdaptation,
} from "@/lib/adaptive/explanation";

type Props = {
  adaptation: ActiveAdaptation | null;
};

/**
 * Member-facing card for the active session adaptation. Renders above
 * the first exercise on /session/[id] when the daily adaptive cron has
 * persisted an `adaptive_v0` hrv_session_modifiers row for this session.
 *
 * All labels + state logic live in `@/lib/adaptive/explanation` and are
 * unit-tested there — the component is presentation only. Renders null
 * for null adaptation so callers can include it unconditionally
 * (mirrors the HrvReadinessNudge pattern).
 *
 * The accept/keep-original CTAs are surfaced for non-escalating actions
 * the member hasn't responded to yet; the form submission lands on
 * `/session/[id]/accept-adaptation` and `/session/[id]/keep-original`
 * (server actions to be wired in the next slice).
 */
export default function AdaptationCard({ adaptation }: Props) {
  if (!adaptation) return null;

  const display = describeAdaptation(adaptation);

  return (
    <section
      aria-labelledby="adaptation-heading"
      className="surface-2 rounded-2xl p-5 lg:p-6 space-y-3"
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
        {adaptation.explanationDa}
      </p>

      {display.showAcceptCTA ? (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            className="flex-1 rounded-lg border hairline bg-bg-2 px-3 py-2 text-[12px] font-mono uppercase tracking-[0.12em] lift touch-app"
            data-adaptation-action="accept"
            data-modifier-id={adaptation.modifierId}
          >
            OK, kør tilpasset
          </button>
          <button
            type="button"
            className="flex-1 rounded-lg border hairline px-3 py-2 text-[12px] font-mono uppercase tracking-[0.12em] text-fg-dim lift touch-app"
            data-adaptation-action="keep-original"
            data-modifier-id={adaptation.modifierId}
          >
            Behold original
          </button>
        </div>
      ) : null}
    </section>
  );
}
