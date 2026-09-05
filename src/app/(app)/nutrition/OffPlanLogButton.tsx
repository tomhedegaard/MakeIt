"use client";

import { useRef, useState, useTransition } from "react";
import { logOffPlanAction } from "./actions";
import StreakCelebration from "@/components/nutrition/StreakCelebration";

/**
 * "Spiste noget andet" — off-plan quick-log.
 *
 * Two triggers, one modal: an inline button for the desktop page
 * header (lg and up) and a floating action button on mobile,
 * parked above the tab-bar. The modal captures just a calorie +
 * protein estimate and an optional label, then logs an off-plan
 * meal that keeps the cooking streak alive.
 */
export default function OffPlanLogButton() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [celebration, setCelebration] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const formData = new FormData(e.currentTarget);
    startTransition(() => {
      logOffPlanAction(formData).then((res) => {
        setOpen(false);
        formRef.current?.reset();
        if (res?.streakMilestone) setCelebration(res.streakMilestone);
      });
    });
  }

  return (
    <>
      {/* Desktop — inline header button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-ghost btn-sm hidden lg:inline-flex"
      >
        Spiste noget andet
      </button>

      {/* Mobile — floating action button, parked above the tab-bar */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Log off-plan måltid"
        className="lg:hidden fixed right-4 z-40 btn btn-primary shadow-lg"
        style={{ bottom: "calc(var(--tabbar-stack) + 16px)" }}
      >
        + Spiste noget andet
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Log off-plan måltid"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        >
          <button
            type="button"
            aria-label="Luk"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="relative w-full sm:max-w-md surface-2 rounded-t-2xl sm:rounded-2xl p-5 lg:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <header className="flex items-start justify-between gap-3">
              <div>
                <div className="eyebrow mb-1">Off-plan</div>
                <h3 className="font-display text-2xl leading-[1.05]">
                  Spiste noget andet
                </h3>
                <p className="text-xs text-fg-faint mt-1">
                  Et hurtigt estimat tæller med — ærlighed slår en brudt streak.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Luk"
                className="text-fg-dim hover:text-fg text-2xl leading-none"
              >
                ×
              </button>
            </header>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-sm">Kalorier</span>
                <input
                  type="number"
                  name="kcal"
                  inputMode="numeric"
                  required
                  min={1}
                  max={10000}
                  placeholder="fx 650"
                  className="input w-full"
                />
                <span className="text-xs text-fg-faint">kcal</span>
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm">Protein</span>
                <input
                  type="number"
                  name="proteinG"
                  inputMode="numeric"
                  required
                  min={0}
                  max={500}
                  placeholder="fx 35"
                  className="input w-full"
                />
                <span className="text-xs text-fg-faint">gram</span>
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-sm">Hvad spiste du <span className="text-fg-faint">(valgfrit)</span></span>
              <input
                type="text"
                name="label"
                maxLength={200}
                placeholder="fx burger og pomfritter ude i byen"
                className="input w-full"
              />
            </label>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={pending}
                className="btn btn-primary flex-1"
              >
                {pending ? "Logger…" : "Log måltid"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn btn-ghost"
              >
                Annullér
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <StreakCelebration
        milestone={celebration}
        onClose={() => setCelebration(null)}
      />
    </>
  );
}
