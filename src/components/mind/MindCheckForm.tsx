"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitMindCheckAction } from "@/app/(app)/mind/check/actions";

type Slider = {
  key: "energy" | "stress" | "focus";
  label: string;
  low: string;
  high: string;
};

const SLIDERS: Slider[] = [
  { key: "energy", label: "Energi", low: "udmattet", high: "opladt" },
  { key: "stress", label: "Stress", low: "rolig", high: "pumpet" },
  { key: "focus", label: "Fokus", low: "spredt", high: "laserskarp" },
];

/**
 * 60-second mind-check. Three 1-5 sliders + 280-char note. Idempotent
 * server-side on (member_id, logged_date), so resubmits today update.
 */
export default function MindCheckForm({
  initial,
}: {
  initial?: {
    energy: number | null;
    stress: number | null;
    focus: number | null;
    note: string | null;
  } | null;
}) {
  const [energy, setEnergy] = useState<number>(initial?.energy ?? 3);
  const [stress, setStress] = useState<number>(initial?.stress ?? 3);
  const [focus, setFocus] = useState<number>(initial?.focus ?? 3);
  const [note, setNote] = useState<string>(initial?.note ?? "");
  const [saved, setSaved] = useState<boolean>(!!initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const setter = (key: Slider["key"]) =>
    ({ energy: setEnergy, stress: setStress, focus: setFocus })[key];
  const value = (key: Slider["key"]) => ({ energy, stress, focus })[key];

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await submitMindCheckAction(formData);
      if (res && "error" in res) {
        setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-10"
    >
      {SLIDERS.map((s) => (
        <fieldset key={s.key} className="space-y-3">
          <legend className="flex items-baseline justify-between w-full">
            <span className="font-display text-xl md:text-2xl">{s.label}</span>
            <span className="text-fg-dim text-sm tabular-nums">
              {value(s.key)} / 5
            </span>
          </legend>
          <input
            type="range"
            name={s.key}
            min={1}
            max={5}
            step={1}
            value={value(s.key)}
            onChange={(e) => setter(s.key)(Number(e.target.value))}
            className="w-full accent-fg"
            aria-label={s.label}
          />
          <div className="flex justify-between text-fg-dim text-xs uppercase tracking-wide">
            <span>{s.low}</span>
            <span>{s.high}</span>
          </div>
        </fieldset>
      ))}

      <fieldset className="space-y-2">
        <legend className="font-display text-xl md:text-2xl">
          En sætning <span className="text-fg-dim text-sm">(valgfri)</span>
        </legend>
        <textarea
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 280))}
          maxLength={280}
          rows={3}
          placeholder="Hvad præger dig lige nu?"
          className="w-full rounded-xl bg-bg-2/60 border hairline px-4 py-3 text-base resize-none focus:outline-none focus:border-fg/40"
        />
        <div className="text-fg-dim text-xs text-right tabular-nums">
          {note.length} / 280
        </div>
      </fieldset>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-full bg-fg text-bg px-7 py-3.5 text-base font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {pending ? "Gemmer..." : saved ? "Opdater" : "Gem mind-check"}
        </button>
        {saved && !pending ? (
          <span className="text-fg-dim text-sm">
            Tjekket ind i dag — du kan opdatere senere.
          </span>
        ) : null}
      </div>
    </form>
  );
}
