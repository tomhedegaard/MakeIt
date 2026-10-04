"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { MealSlot } from "@/lib/data/nutrition";
import { logMealAction } from "./actions";
import StreakCelebration from "@/components/nutrition/StreakCelebration";
import { Sheet, SheetContent } from "@/components/ui/Sheet";

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

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          title={mealTitle ?? t("freeMeal")}
          description={slot ? t("slotDate", { slot: ts(slot), date: dateIso }) : t("dialogLabel")}
        >
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            {/* Hidden routing fields */}
            {mealId ? <input type="hidden" name="mealId" value={mealId} /> : null}
            <input type="hidden" name="loggedForDate" value={dateIso} />
            {slot ? <input type="hidden" name="loggedForSlot" value={slot} /> : null}

            {/* Photo */}
            <div className="space-y-2">
              <div className="text-copy">{t("photoTitle")}</div>
              <label className="block border border-dashed hairline-strong bg-bg px-4 py-6 text-center cursor-pointer transition-colors duration-200 ease-out hover:border-fg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-fg has-[:focus-visible]:outline-solid">
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
                    className="max-h-48 mx-auto"
                  />
                ) : (
                  <>
                    <div className="text-copy">{t("photoPrompt")}</div>
                    <div className="text-micro text-fg-dim mt-1">
                      {t("photoHint")}
                    </div>
                  </>
                )}
              </label>
            </div>

            {/* Rating */}
            <div className="space-y-1.5">
              <div className="text-copy">{t("ratingTitle")}</div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className="size-11 border hairline flex items-center justify-center text-copy transition-colors duration-200 ease-out"
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
              <span className="text-copy">{t("notesLabel")}</span>
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
                aria-disabled={pending}
                onClick={(e) => {
                  if (pending) e.preventDefault();
                }}
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
        </SheetContent>
      </Sheet>

      <StreakCelebration
        milestone={celebration}
        onClose={() => setCelebration(null)}
      />
    </>
  );
}
