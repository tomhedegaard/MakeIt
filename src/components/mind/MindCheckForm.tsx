"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { submitMindCheckAction } from "@/app/(app)/mind/check/actions";
import { rangeFill } from "@/lib/ui/range";

type SliderKey = "energy" | "stress" | "focus";

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
  const t = useTranslations("Mind.check");

  const sliders: { key: SliderKey; label: string; low: string; high: string }[] = [
    { key: "energy", label: t("energy"), low: t("energyLow"), high: t("energyHigh") },
    { key: "stress", label: t("stress"), low: t("stressLow"), high: t("stressHigh") },
    { key: "focus", label: t("focus"), low: t("focusLow"), high: t("focusHigh") },
  ];

  const setter = (key: SliderKey) =>
    ({ energy: setEnergy, stress: setStress, focus: setFocus })[key];
  const value = (key: SliderKey) => ({ energy, stress, focus })[key];

  // Spoken value: "3 af 5", with the anchor word at the ends.
  function valueText(v: number, low: string, high: string): string {
    const base = t("valueText", { value: v });
    return v === 1 ? `${base}, ${low}` : v === 5 ? `${base}, ${high}` : base;
  }

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
      {sliders.map((s) => (
        <fieldset key={s.key} className="space-y-3">
          <legend className="flex items-baseline justify-between w-full">
            <span className="font-display text-section">{s.label}</span>
            <span className="text-fg-dim text-meta tabular">
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
            className="range w-full"
            style={rangeFill(value(s.key), 1, 5)}
            aria-label={s.label}
            aria-valuetext={valueText(value(s.key), s.low, s.high)}
          />
          <div className="flex justify-between text-fg-dim text-micro">
            <span>{s.low}</span>
            <span>{s.high}</span>
          </div>
        </fieldset>
      ))}

      <fieldset className="space-y-2">
        <legend className="font-display text-section">
          {t("noteLabel")} <span className="text-fg-dim text-meta">{t("noteOptional")}</span>
        </legend>
        <textarea
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 280))}
          maxLength={280}
          rows={3}
          placeholder={t("notePlaceholder")}
          className="input w-full text-copy resize-none"
        />
        <div className="text-fg-dim text-micro text-right tabular">
          {note.length} / 280
        </div>
      </fieldset>

      {error ? (
        <div role="alert" className="border border-danger/30 bg-danger/5 px-4 py-3 text-copy text-danger">
          {error}
        </div>
      ) : null}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          aria-disabled={pending}
          onClick={(e) => {
            if (pending) e.preventDefault();
          }}
          className="btn btn-primary aria-disabled:opacity-50"
        >
          {pending ? t("saving") : saved ? t("update") : t("save")}
        </button>
      </div>
    </form>
  );
}
