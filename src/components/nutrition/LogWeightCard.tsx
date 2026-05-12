"use client";

import { useState, useTransition } from "react";
import { logWeightAction } from "@/app/(app)/nutrition/actions";

/**
 * Compact weigh-in card for /nutrition. Shows the most-recent
 * entry + a tap-to-log expand. Expanded state is a one-input
 * inline form so the user never leaves the page.
 *
 * Why inline instead of a route: weighing-in is friction-sensitive
 * (members do it half-asleep, post-bathroom, before coffee). One
 * extra tap drops compliance by a measurable amount. Keep it to:
 *   open card → type number → submit → see new latest value.
 */
export default function LogWeightCard({
  latestKg,
  latestLoggedAt,
  deltaKg,
}: {
  latestKg: number | null;
  latestLoggedAt: string | null;
  deltaKg: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      await logWeightAction(formData);
      setOpen(false);
    });
  }

  const ageDays = latestLoggedAt
    ? Math.floor(
        (Date.now() - Date.parse(latestLoggedAt)) / (1000 * 60 * 60 * 24),
      )
    : null;

  return (
    <section className="surface-2 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="eyebrow mb-1">Bodyweight</div>
          {latestKg ? (
            <>
              <div className="font-display text-3xl numeric leading-none">
                {latestKg.toFixed(1)} <span className="text-base text-fg-faint">kg</span>
              </div>
              <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
                {ageDays === 0
                  ? "Logget i dag"
                  : ageDays === 1
                  ? "Logget i går"
                  : `Logget for ${ageDays} dage siden`}
                {deltaKg !== null ? (
                  <>
                    {" · "}
                    <span
                      className={
                        Math.abs(deltaKg) < 0.1
                          ? "text-fg-faint"
                          : deltaKg < 0
                          ? "text-green-400"
                          : "text-yellow-400"
                      }
                    >
                      {deltaKg > 0 ? "+" : ""}
                      {deltaKg.toFixed(1)} kg seneste uge
                    </span>
                  </>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-sm text-fg-dim mt-1">
              Endnu ingen vejning. Log den første for at få personlige macros.
            </p>
          )}
        </div>

        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn btn-sm shrink-0"
          >
            Log ny →
          </button>
        ) : null}
      </div>

      {open ? (
        <form action={submit} className="mt-5 flex items-end gap-3">
          <label className="block flex-1">
            <span className="eyebrow block mb-1.5">Vægt</span>
            <div className="relative">
              <input
                type="number"
                name="kg"
                required
                min="35"
                max="250"
                step="0.1"
                inputMode="decimal"
                autoFocus
                placeholder="—"
                className="field text-xl numeric pr-12"
                autoComplete="off"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono uppercase text-fg-faint">
                kg
              </span>
            </div>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary"
          >
            {pending ? "…" : "Gem"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setOpen(false)}
            className="btn btn-ghost"
          >
            Annullér
          </button>
        </form>
      ) : null}
    </section>
  );
}
