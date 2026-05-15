"use client";

import { useState } from "react";
import FormCheckSheet from "@/components/ui/FormCheckSheet";
import type { ExerciseMistake } from "@/lib/data/exercises";
import type { FormCheckQuota } from "@/lib/data/form-check-quota";

/**
 * Button + sheet pair for the exercise detail page. Sits in the
 * server-rendered detail page as a client island. Forwards the
 * exercise-specific coaching context (id, cues, mistakes) to the
 * form-check sheet so Claude evaluates against THIS exercise's
 * checklist, not generic principles. Renders the monthly quota
 * counter inline on the button so members know what they have left.
 */
export default function FormCheckTrigger({
  exerciseId,
  exerciseName,
  cues,
  mistakes,
  quota,
}: {
  exerciseId: string;
  exerciseName: string;
  cues: string[];
  mistakes: ExerciseMistake[];
  quota: FormCheckQuota;
}) {
  const [open, setOpen] = useState(false);
  const showCounter = quota.limit > 0 && quota.limit < 999;
  const exhausted = !quota.hasRemaining;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto flex items-center justify-between gap-4 surface-2 rounded-xl px-5 py-4 lift touch-app"
      >
        <span className="flex items-center gap-3 text-left">
          <svg
            viewBox="0 0 24 24"
            className="size-5 text-fg-dim shrink-0"
            fill="none"
            aria-hidden
          >
            <rect x="3" y="6" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
            <path d="M17 10l4-2v8l-4-2v-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <circle cx="9" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          <span>
            <span className="block font-display text-base leading-tight">
              {exhausted ? "AI form-check — månedlig grænse nået" : "Test din form med AI"}
            </span>
            <span className="block text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint mt-0.5">
              {cues.length} cues · {mistakes.length} typiske fejl
              {showCounter
                ? ` · ${quota.used}/${quota.limit} brugt`
                : null}
            </span>
          </span>
        </span>
        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint shrink-0">
          {exhausted ? "Upgrade →" : "~6 sek →"}
        </span>
      </button>

      <FormCheckSheet
        open={open}
        onOpenChange={setOpen}
        exerciseName={exerciseName}
        context={{ exerciseId, cues, mistakes }}
        quota={quota}
      />
    </>
  );
}
