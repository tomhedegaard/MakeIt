"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "mi_tour_done_v1";

const STEPS: { eyebrow: string; title: string; body: string }[] = [
  {
    eyebrow: "Velkommen",
    title: "Du er inde i crewet.",
    body:
      "Hurtig rundtur — så ved du hvor alt ligger. 4 skærme, 30 sekunder.",
  },
  {
    eyebrow: "01 · Today",
    title: "Dagens session ligger her.",
    body:
      "Hver morgen åbner du Today. Tap det store \"Start session →\"-kort og du er i gang. AI'en har allerede valgt vægte ud fra dine 1RM'er.",
  },
  {
    eyebrow: "02 · Træn / Crew / Reps / Mig",
    title: "Bottom tab-bar = hele appen.",
    body:
      "Træn = dine programmer. Crew = feed med PR'er + form-checks. Reps = optjen og indløs. Mig = profil, lifts-historik og coach-noter fra Mikael.",
  },
  {
    eyebrow: "03 · Form-check",
    title: "AI vurderer din teknik.",
    body:
      "Tap \"Form-check med AI\" inde i en session. Optag eller upload — du får svar inden for sekunder. Mikael godkender personligt inden 24 timer.",
  },
  {
    eyebrow: "04 · Reps",
    title: "Du får for det du laver.",
    body:
      "+250 Reps pr. fuldført session. +100 pr. uge i program. Bytt dem til limited drops, custom-broderede straps, og 1:1 tid med Mikael.",
  },
];

export default function FirstTimeTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // One-shot client-only check for the localStorage flag. The lint
  // rule about setState-in-effect doesn't apply here — this is the
  // exact pattern for "show me only on first visit" persistence and
  // the alternative (initializer) would cause hydration mismatch.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const done = window.localStorage.getItem(STORAGE_KEY);
      if (!done) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOpen(true);
      }
    } catch {
      // localStorage might be blocked — silently skip.
    }
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  }

  function next() {
    if (step >= STEPS.length - 1) {
      dismiss();
      return;
    }
    setStep((s) => s + 1);
  }

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={dismiss}
        aria-hidden
      />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md surface-2 rounded-2xl p-6 lg:p-8"
        style={{ borderColor: "var(--line-bright)" }}
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-3 right-3 text-fg-dim hover:text-fg text-xs font-mono uppercase tracking-[0.14em]"
        >
          Spring over
        </button>

        <div className="eyebrow mb-3">{current.eyebrow}</div>
        <h2
          id="tour-title"
          className="font-display text-2xl md:text-3xl leading-[1.05] mb-3"
        >
          {current.title}
        </h2>
        <p className="text-fg-dim text-sm md:text-base leading-relaxed mb-6">
          {current.body}
        </p>

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <span
              key={i}
              aria-hidden
              className="flex-1 h-1 rounded-full"
              style={{
                background:
                  i <= step ? "var(--fg)" : "var(--bg-elev)",
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          {step > 0 ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setStep((s) => s - 1)}
            >
              Tilbage
            </button>
          ) : null}
          {isLast ? (
            <Link
              href="/coaching"
              onClick={dismiss}
              className="btn btn-primary ml-auto"
            >
              Begynd →
            </Link>
          ) : (
            <button
              type="button"
              className="btn btn-primary ml-auto"
              onClick={next}
            >
              Næste →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
