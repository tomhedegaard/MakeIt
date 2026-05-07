"use client";

import { useState, useTransition } from "react";
import { Sheet, SheetContent } from "@/components/ui/Sheet";
import { reviewFormCheckAction } from "@/app/coach/queue/actions";
import type { FormCheckRow } from "@/lib/data/coach";

export default function CoachReviewButton({
  formCheck,
}: {
  formCheck: FormCheckRow;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const res = await reviewFormCheckAction(formCheck.id, notes);
      if (res.ok) {
        setOpen(false);
        setNotes("");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        onClick={() => setOpen(true)}
      >
        Review →
      </button>
      <SheetContent>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="eyebrow mb-1">@{formCheck.memberHandle} · {formCheck.exerciseName ?? "Form-check"}</div>
            <h2 className="font-display text-2xl">{formCheck.aiHeadline ?? "AI-svar"}</h2>
          </div>
          <div className="text-right shrink-0">
            <div className="numeric text-3xl">{formCheck.aiScore ?? "—"}</div>
            <div className="eyebrow">/ 100</div>
          </div>
        </div>

        {formCheck.videoUrl ? (
          <div className="mb-4 rounded-xl overflow-hidden surface bg-bg-3">
            <video
              src={formCheck.videoUrl}
              controls
              playsInline
              preload="metadata"
              className="w-full max-h-[420px] object-contain bg-black"
            />
            <div className="px-4 py-2 text-[10px] font-mono uppercase tracking-[0.16em] text-fg-faint border-t hairline">
              Signeret afspillings-link · udløber om 1 time
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          {formCheck.aiPos.length > 0 ? (
            <Card title="Positive observationer" items={formCheck.aiPos} />
          ) : null}
          {formCheck.aiNeg.length > 0 ? (
            <Card title="Områder at stramme op" items={formCheck.aiNeg} />
          ) : null}
          {formCheck.aiFix ? (
            <div className="surface-2 rounded-lg p-4">
              <div className="eyebrow mb-2">AI-tip</div>
              <p className="text-sm text-fg/90 leading-relaxed">{formCheck.aiFix}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          <label className="block">
            <span className="eyebrow block mb-2">Coach-noter (sendes til @{formCheck.memberHandle})</span>
            <textarea
              className="field min-h-[100px] py-3 resize-none w-full"
              placeholder="Hvad mangler AI'en at fange? Specifikke instruktioner til næste session?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <button
            type="button"
            className="btn"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Annullér
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={submit}
            disabled={pending}
          >
            {pending ? "Sender…" : "Godkend & send"}
          </button>
        </div>

        <p className="mt-4 text-xs font-mono text-fg-faint text-center">
          Markerer form-checken som reviewed og sender notes til medlemmet.
        </p>
      </SheetContent>
    </Sheet>
  );
}

function Card({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="surface-2 rounded-lg p-4">
      <div className="eyebrow mb-2">{title}</div>
      <ul className="space-y-1.5 text-sm text-fg/90">
        {items.map((it) => (
          <li key={it} className="flex gap-2">
            <span className="text-fg-faint shrink-0">·</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
