"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitJournalEntryAction } from "@/app/(app)/mind/journal/actions";
import MentalResourcesModal from "./MentalResourcesModal";

/**
 * Journal entry form — 2000-char body with rotating prompt.
 *
 * On submit: server runs crisis-keyword pre-filter. If flagged, this
 * component surfaces the MentalResourcesModal. The entry persists
 * either way; no Reps for flagged entries.
 */
export default function JournalForm({
  prompt,
  initialBody,
}: {
  prompt: { key: string; text: string };
  initialBody: string;
}) {
  const [body, setBody] = useState<string>(initialBody);
  const [showResources, setShowResources] = useState(false);
  const [saved, setSaved] = useState<boolean>(initialBody.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await submitJournalEntryAction(formData);
      if (res && "error" in res) {
        setError(res.error);
        return;
      }
      setSaved(true);
      if (res.moderation === "crisis") {
        setShowResources(true);
      }
      router.refresh();
    });
  }

  return (
    <>
      <form action={handleSubmit} className="space-y-6">
        <input type="hidden" name="prompt_key" value={prompt.key} />
        <input type="hidden" name="prompt_text" value={prompt.text} />

        <div className="rounded-2xl border hairline bg-bg-2/40 p-5">
          <div className="eyebrow mb-2">Dagens prompt</div>
          <p className="font-display text-xl md:text-2xl">{prompt.text}</p>
        </div>

        <textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 2000))}
          maxLength={2000}
          rows={10}
          required
          placeholder="Skriv frit. Kun du ser dette."
          className="w-full rounded-2xl bg-bg-2/60 border hairline px-5 py-4 text-base leading-relaxed resize-none focus:outline-none focus:border-fg/40"
        />
        <div className="flex items-center justify-between text-fg-dim text-xs">
          <span>Din journal er privat. Aldrig synlig for Munk, coaches eller andre.</span>
          <span className="tabular-nums">{body.length} / 2000</span>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={pending || body.trim().length === 0}
            className="inline-flex items-center justify-center rounded-full bg-fg text-bg px-7 py-3.5 text-base font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {pending ? "Gemmer..." : saved ? "Opdater" : "Gem post"}
          </button>
          {saved && !pending ? (
            <span className="text-fg-dim text-sm">
              Gemt — kun du ser den.
            </span>
          ) : null}
        </div>
      </form>

      <MentalResourcesModal
        open={showResources}
        onClose={() => setShowResources(false)}
      />
    </>
  );
}
