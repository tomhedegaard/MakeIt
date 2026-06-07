"use client";

import { useState } from "react";

/**
 * Surfaces when the journal pre-filter detects a crisis keyword.
 * No automatic coach escalation — the member explicitly chooses to
 * tell Munk (or not). This is the MH-3 stub; MH-9 hardens it with
 * Claude moderation + consent-gated coach-queue insertion.
 */
export default function MentalResourcesModal({
  open: openInitially,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(openInitially);

  function close() {
    setOpen(false);
    onClose();
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mental-resources-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <div className="max-w-lg w-full rounded-2xl border hairline bg-bg-2 p-8 space-y-6">
        <div>
          <div className="eyebrow mb-3">Mind · sikkerhed</div>
          <h2 id="mental-resources-title" className="font-display text-2xl md:text-3xl">
            Vi så et ord der bekymrer os.
          </h2>
        </div>

        <p className="text-fg-dim leading-relaxed">
          Du skrev noget der lyder som om du har det rigtig svært lige nu.
          Du behøver ikke gøre noget med os her — det vigtigste er at du
          taler med et menneske der kan hjælpe.
        </p>

        <div className="border-l-2 border-fg/30 pl-5 space-y-1.5">
          <h3 className="eyebrow mb-2">Hvis det brænder</h3>
          <p>
            <a href="tel:70201201" className="underline hover:opacity-80">
              Livslinien · 70 201 201
            </a>{" "}
            <span className="text-fg-dim text-sm">(døgnet rundt)</span>
          </p>
          <p>
            <a href="tel:112" className="underline hover:opacity-80">
              Akut hjælp · 112
            </a>
          </p>
          <p className="text-fg-dim">Din egen læge eller psykiatrisk skadestue</p>
        </div>

        <p className="text-fg-dim text-sm">
          Din journal-post er gemt og er stadig kun din. Vi har ikke
          delt noget med nogen. I MH-9 kommer en knap her hvor du selv
          kan vælge at fortælle Munk at du har det svært — hvis du
          ønsker det.
        </p>

        <button
          type="button"
          onClick={close}
          className="inline-flex items-center justify-center rounded-full bg-fg text-bg px-7 py-3 text-base font-medium hover:opacity-90 transition-opacity"
        >
          Tak — luk
        </button>
      </div>
    </div>
  );
}
