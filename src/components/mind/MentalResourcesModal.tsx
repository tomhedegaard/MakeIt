"use client";

import { useState, useTransition } from "react";
import { escalateMentalSafetyAction } from "@/app/(app)/mind/journal/escalate-actions";

/**
 * Surfaces when the journal moderation pipeline detects a crisis or
 * flagged entry. Two modes:
 *
 *  - Resources view (default): emergency numbers + privacy reassurance
 *  - Tell Munk view: member-written summary textarea + submit; the
 *    raw journal is NEVER shared, only what the member chooses to
 *    write here.
 *
 * No automatic escalation. The member chooses.
 */
export default function MentalResourcesModal({
  open: openInitially,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(openInitially);
  const [mode, setMode] = useState<"resources" | "escalate" | "sent">("resources");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    onClose();
  }

  function submitEscalation(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await escalateMentalSafetyAction(formData);
      if (res && "error" in res) {
        setError(res.error);
        return;
      }
      setMode("sent");
    });
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
        {mode === "resources" ? (
          <>
            <div>
              <div className="eyebrow mb-3">Mind · sikkerhed</div>
              <h2
                id="mental-resources-title"
                className="font-display text-2xl md:text-3xl"
              >
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
              delt noget med nogen.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMode("escalate")}
                className="inline-flex items-center justify-center rounded-full border hairline px-5 py-2.5 text-sm font-medium hover:bg-bg/30 transition-colors"
              >
                Fortæl Munk
              </button>
              <button
                type="button"
                onClick={close}
                className="inline-flex items-center justify-center rounded-full bg-fg text-bg px-7 py-3 text-base font-medium hover:opacity-90 transition-opacity"
              >
                Tak — luk
              </button>
            </div>
          </>
        ) : null}

        {mode === "escalate" ? (
          <form action={submitEscalation} className="space-y-5">
            <div>
              <div className="eyebrow mb-3">Mind · fortæl Munk</div>
              <h2 className="font-display text-2xl md:text-3xl">
                Skriv selv hvad du vil dele.
              </h2>
            </div>
            <p className="text-fg-dim text-sm leading-relaxed">
              Munk ser KUN det du skriver her. Aldrig din journal. Vær så
              kort eller udførlig du har lyst til.
            </p>
            <textarea
              name="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value.slice(0, 1000))}
              minLength={4}
              maxLength={1000}
              required
              rows={6}
              placeholder="Fx: 'Jeg har det svært i øjeblikket. Kunne vi tale i denne uge?'"
              className="w-full rounded-xl bg-bg/60 border hairline px-4 py-3 text-base resize-none focus:outline-none focus:border-fg/40"
            />
            <div className="text-fg-dim text-xs text-right tabular-nums">
              {summary.length} / 1000
            </div>
            {error ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMode("resources")}
                className="text-fg-dim text-sm hover:text-fg"
              >
                Tilbage
              </button>
              <button
                type="submit"
                disabled={pending || summary.trim().length < 4}
                className="inline-flex items-center justify-center rounded-full bg-fg text-bg px-7 py-3 text-base font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {pending ? "Sender..." : "Send til Munk"}
              </button>
            </div>
          </form>
        ) : null}

        {mode === "sent" ? (
          <>
            <div>
              <div className="eyebrow mb-3">Mind · sendt</div>
              <h2 className="font-display text-2xl md:text-3xl">
                Munk får besked.
              </h2>
            </div>
            <p className="text-fg-dim leading-relaxed">
              Tak fordi du turde. Munk gennemgår beskeden hurtigst muligt og
              skriver tilbage. Hvis du har det rigtig svært før han svarer:
              Livslinien 70 201 201, døgnet rundt.
            </p>
            <button
              type="button"
              onClick={close}
              className="inline-flex items-center justify-center rounded-full bg-fg text-bg px-7 py-3 text-base font-medium hover:opacity-90 transition-opacity"
            >
              Luk
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
