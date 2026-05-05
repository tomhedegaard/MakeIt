"use client";

import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/Sheet";
import FormCheckSheet from "@/components/ui/FormCheckSheet";

export default function PostComposer({
  trigger,
}: {
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [tag, setTag] = useState<"PR" | "Note" | "Form-check" | null>(null);
  const [formCheckOpen, setFormCheckOpen] = useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <span onClick={() => setOpen(true)}>{trigger}</span>
        <SheetContent>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="eyebrow mb-1">Del med crewet</div>
              <h2 className="font-display text-2xl">Hvad har du på i dag?</h2>
            </div>
          </div>

          <div className="pillgroup mb-4">
            {(["PR", "Note", "Form-check"] as const).map((t) => (
              <button
                key={t}
                type="button"
                data-active={tag === t}
                className="pill touch-app"
                onClick={() => setTag(tag === t ? null : t)}
              >
                {t}
              </button>
            ))}
          </div>

          <textarea
            className="field min-h-[120px] py-3 resize-none w-full"
            placeholder={
              tag === "PR"
                ? "Hvad PR'ede du? Hvor mange kg, hvor mange reps?"
                : tag === "Form-check"
                  ? "Beskriv hvad du gerne vil have feedback på..."
                  : "Skriv noget til crewet..."
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <button
            type="button"
            className="surface rounded-xl p-4 mt-3 text-left flex items-center justify-between gap-3 lift touch-app w-full"
            onClick={() => setFormCheckOpen(true)}
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-bg-3 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="size-5 text-fg-dim" fill="none" aria-hidden>
                  <rect x="3" y="6" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M17 10l4-2v8l-4-2v-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div className="text-sm">Tilføj video</div>
                <div className="text-xs text-fg-dim">Optag eller upload — AI form-check inkluderet</div>
              </div>
            </div>
            <span className="text-fg-faint text-sm">→</span>
          </button>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <button
              type="button"
              className="btn"
              onClick={() => setOpen(false)}
            >
              Annullér
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!text.trim() && !tag}
              onClick={() => {
                // Mock: just close — real persistence comes with auth/db
                setText("");
                setTag(null);
                setOpen(false);
              }}
            >
              Del →
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <FormCheckSheet open={formCheckOpen} onOpenChange={setFormCheckOpen} />
    </>
  );
}
