"use client";

import { useTransition } from "react";
import { toggleSkipDayAction } from "@/app/(app)/nutrition/actions";

/**
 * Per-week skip-day toggler. Renders 7 day-cells (Mon..Sun); cells
 * already flagged as skip show in red/dim, untouched cells are
 * neutral. Click toggles via the server action and revalidates.
 *
 * Regeneration is NOT auto-triggered — the user might toggle a few
 * days, then hit "Regenerér ugeplan" once. We surface the hint
 * inline so the user understands the flow.
 */
export default function SkipDaysCard({
  weekStart,
  skipDayIndices,
}: {
  /** ISO Monday YYYY-MM-DD. */
  weekStart: string;
  /** Day indices currently flagged as skip (Mon=0). */
  skipDayIndices: number[];
}) {
  const [pending, startTransition] = useTransition();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${weekStart}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return {
      index: i,
      dateIso: d.toISOString().slice(0, 10),
      label: ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"][i],
      day: d.getUTCDate(),
      skipped: skipDayIndices.includes(i),
    };
  });

  function toggle(dateIso: string, present: boolean) {
    if (pending) return;
    const fd = new FormData();
    fd.set("date", dateIso);
    fd.set("present", present ? "true" : "false");
    startTransition(() => {
      toggleSkipDayAction(fd);
    });
  }

  return (
    <section className="surface-2 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="eyebrow mb-1">Skip-dage</div>
          <p className="text-sm text-fg-dim max-w-md">
            Markér dage hvor du spiser ud, rejser eller faster. Planneren
            springer dem over på næste generation — adherence-stats
            tæller dem ikke imod dig.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => (
          <button
            key={d.dateIso}
            type="button"
            disabled={pending}
            onClick={() => toggle(d.dateIso, d.skipped)}
            className={`relative rounded-lg p-2 text-center transition-colors hairline border ${
              d.skipped
                ? "bg-red-400/15 border-red-400/40 text-red-300"
                : "bg-bg hover:bg-bg-3"
            } disabled:opacity-50`}
            aria-pressed={d.skipped}
            aria-label={
              d.skipped ? `Fjern skip for ${d.label}` : `Markér ${d.label} som skip`
            }
          >
            <div className="eyebrow text-[10px] mb-0.5">{d.label}</div>
            <div className="numeric text-base">{d.day}</div>
            {d.skipped ? (
              <div className="text-[9px] font-mono uppercase tracking-[0.14em] mt-1">
                Skip
              </div>
            ) : null}
          </button>
        ))}
      </div>
      {skipDayIndices.length > 0 ? (
        <p className="mt-3 text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
          Regenerér ugeplan for at fjerne meals fra markerede dage
        </p>
      ) : null}
    </section>
  );
}
