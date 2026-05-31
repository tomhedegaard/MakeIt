"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { MealSlot } from "@/lib/data/nutrition";
import { logMealAction } from "./actions";
import StreakCelebration from "@/components/nutrition/StreakCelebration";

export default function LogMealButton({
  mealId,
  mealTitle,
  slot,
  dateIso,
}: {
  mealId?: string;
  mealTitle?: string;
  slot?: MealSlot;
  dateIso: string;
}) {
  const t = useTranslations("Nutrition.logMeal");
  const ts = useTranslations("Nutrition.slotLabels");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [rating, setRating] = useState<number>(4);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoPreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const formData = new FormData(e.currentTarget);
    formData.set("rating", String(rating));
    startTransition(() => {
      logMealAction(formData).then((res) => {
        setOpen(false);
        setPhotoPreview(null);
        setRating(4);
        formRef.current?.reset();
        if (res?.streakMilestone) setCelebration(res.streakMilestone);
      });
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-ghost btn-sm"
      >
        {t("trigger")}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("dialogLabel")}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        >
          <button
            type="button"
            aria-label={t("closeLabel")}
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
                <div className="eyebrow mb-1">{t("eyebrow")}</div>
                <h3 className="font-display text-2xl leading-[1.05]">
                  {mealTitle ?? t("freeMeal")}
                </h3>
                {slot ? (
                  <div className="text-xs text-fg-faint mt-1 font-mono">
                    {t("slotDate", { slot: ts(slot), date: dateIso })}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("closeLabel")}
                className="text-fg-dim hover:text-fg text-2xl leading-none"
              >
                ×
              </button>
            </header>

            {/* Hidden routing fields */}
            {mealId ? <input type="hidden" name="mealId" value={mealId} /> : null}
            <input type="hidden" name="loggedForDate" value={dateIso} />
            {slot ? <input type="hidden" name="loggedForSlot" value={slot} /> : null}

            {/* Photo */}
            <div className="space-y-2">
              <div className="text-sm">{t("photoTitle")}</div>
              <label className="block surface-2 rounded-lg border-dashed border-2 border-fg-faint/30 px-4 py-6 text-center cursor-pointer hover:border-fg-dim/50">
                <input
                  type="file"
                  name="photo"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhoto}
                  className="sr-only"
                />
                {photoPreview ? (
                  // Preview as plain img — Next/Image needs known dimensions which
                  // we don't have for an arbitrary user upload.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoPreview}
                    alt={t("photoPreviewAlt")}
                    className="max-h-48 mx-auto rounded-md"
                  />
                ) : (
                  <>
                    <div className="text-sm">{t("photoPrompt")}</div>
                    <div className="text-xs text-fg-faint mt-1">
                      {t("photoHint")}
                    </div>
                  </>
                )}
              </label>
            </div>

            {/* Rating */}
            <div className="space-y-1.5">
              <div className="text-sm">{t("ratingTitle")}</div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className="size-9 rounded-md border hairline flex items-center justify-center text-sm transition-colors"
                    style={{
                      background: n <= rating ? "var(--fg)" : "transparent",
                      color: n <= rating ? "var(--bg)" : "var(--fg-dim)",
                    }}
                    aria-label={t("ratingStars", { n })}
                    aria-pressed={n === rating}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <label className="block space-y-1.5">
              <span className="text-sm">{t("notesLabel")}</span>
              <textarea
                name="notes"
                rows={2}
                className="input w-full"
                placeholder={t("notesPlaceholder")}
              />
            </label>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={pending}
                className="btn btn-primary flex-1"
              >
                {pending ? t("logging") : t("submit")}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn btn-ghost"
              >
                {t("cancel")}
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
