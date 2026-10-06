"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { intlLocaleTag } from "@/i18n/config";
import { formatNumber } from "@/lib/utils";
import ConfirmSheet from "@/components/ui/ConfirmSheet";
import type { Meal } from "@/lib/data/nutrition";
import { swapMealAction } from "./actions";
import LogMealButton from "./LogMealButton";
import { Camera } from "lucide-react";
import { ICON } from "@/components/ui/icon";

const CARB_DENSITY_KEYS: Record<Meal["carbDensity"], string> = {
  low: "carbLow",
  standard: "carbStandard",
  high: "carbHigh",
};

export default function MealCard({
  meal,
  loggable,
  compact = false,
  swapQuotaRemaining,
  hideNumbers = false,
}: {
  meal: Meal;
  loggable: boolean;
  compact?: boolean;
  /** "Vis ikke kalorier og vægt" (spec §S): protein stays, kcal goes. */
  hideNumbers?: boolean;
  /** Number of meal swaps left this period. Undefined = unlimited / unknown. */
  swapQuotaRemaining?: number;
}) {
  const t = useTranslations("Nutrition.mealCard");
  const ts = useTranslations("Nutrition.slotLabels");
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const tag = intlLocaleTag(useLocale());
  const fmt = (n: number | null) => (n == null ? "-" : formatNumber(n, tag));
  const [pending, startTransition] = useTransition();
  const swapExhausted =
    swapQuotaRemaining !== undefined && swapQuotaRemaining <= 0;
  const swapDisabled = pending || swapExhausted;

  function handleSwap() {
    if (swapDisabled) return;
    setConfirmOpen(true);
  }

  function doSwap() {
    const formData = new FormData();
    formData.set("mealId", meal.id);
    startTransition(() => {
      swapMealAction(formData);
    });
  }

  const confirmSheet = (
    <ConfirmSheet
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title={t("swapConfirm", { title: meal.title, slot: ts(meal.slot).toLowerCase() })}
      confirmLabel={t("swapShort")}
      onConfirm={doSwap}
    />
  );

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <span className="eyebrow w-16 shrink-0">{ts(meal.slot)}</span>
        {meal.imageThumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={meal.imageThumbUrl}
            alt=""
            loading="lazy"
            className="size-10 rounded-md object-cover shrink-0 hairline border"
          />
        ) : null}
        <div className="flex-1 min-w-0">
          <div className="text-copy text-pretty">{meal.title}</div>
          <div className="text-micro text-fg-faint">
            {hideNumbers ? null : `${fmt(meal.estKcal)} kcal · `}
            {t("macroProtein", { value: fmt(meal.estProteinG) })} · {fmt(meal.prepMinutes)} min
          </div>
        </div>
        {meal.swappable ? (
          <button
            type="button"
            onClick={handleSwap}
            disabled={swapDisabled}
            title={swapExhausted ? t("swapExhaustedTitle") : undefined}
            className="btn btn-ghost btn-sm shrink-0"
            aria-label={t("swapAria", { title: meal.title })}
          >
            {pending ? "…" : t("swapShort")}
          </button>
        ) : null}
        {confirmSheet}
      </div>
    );
  }

  return (
    <article className="surface-2 rounded-xl overflow-hidden">
      <div className="flex flex-col sm:flex-row-reverse">
        {/* Unsplash thumbnail — side image on desktop, hero strip on
            mobile. Compact aspect so the macro info dominates. Click
            goes to the photographer's profile (Unsplash ToS). */}
        {meal.imageUrl ? (
          <a
            href={meal.imageAttributionUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block w-full sm:w-44 md:w-56 aspect-[16/9] sm:aspect-auto sm:self-stretch overflow-hidden group shrink-0"
            aria-label={
              meal.imageAttributionName
                ? t("photoBy", { name: meal.imageAttributionName })
                : t("photoVia")
            }
          >
            {/* Plain img: next.config has no images.remotePatterns for
                Unsplash, so next/image cannot load it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={meal.imageUrl}
              alt={meal.title}
              loading="lazy"
              decoding="async"
              width={448}
              height={252}
              className="absolute inset-0 size-full object-cover transition-transform duration-200 ease-out motion-reduce:transition-none group-hover:scale-[1.02]"
            />
            {meal.imageAttributionName ? (
              <span
                data-theme="nat"
                className="absolute bottom-2 right-2 inline-flex items-center gap-1 text-micro text-fg bg-bg px-1.5 py-0.5"
              >
                <Camera {...ICON} className="size-3.5" />
                {meal.imageAttributionName}
              </span>
            ) : null}
          </a>
        ) : null}

        <div className="flex-1 min-w-0">
          <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="eyebrow mb-1.5 flex items-center gap-2">
                {ts(meal.slot)}
                <span className="text-fg-faint" aria-hidden>·</span>
                <span>{t(CARB_DENSITY_KEYS[meal.carbDensity])}</span>
                {meal.kind === "recipe" ? (
                  <>
                    <span className="text-fg-faint" aria-hidden>·</span>
                    <span className="numeric border hairline-strong px-2 py-0.5 text-micro">
                      {t("anchor")}
                    </span>
                  </>
                ) : null}
              </div>
              <h3 className="font-display text-card mb-1.5">
                {meal.title}
              </h3>
              {meal.description ? (
                <p className="text-fg-dim text-meta">{meal.description}</p>
              ) : null}
            </div>
            {hideNumbers ? null : (
              <div className="text-right shrink-0">
                <div className="numeric text-section">{fmt(meal.estKcal)}</div>
                <div className="eyebrow">{t("kcal")}</div>
              </div>
            )}
          </div>

          {/* Macro pills */}
          <div className="px-5 pb-3 flex flex-wrap items-center gap-2 text-micro">
            <span className="text-fg-dim">{t("macroProtein", { value: fmt(meal.estProteinG) })}</span>
            <span className="text-fg-faint" aria-hidden>·</span>
            <span className="text-fg-dim">{t("macroCarbs", { value: fmt(meal.estCarbsG) })}</span>
            <span className="text-fg-faint" aria-hidden>·</span>
            <span className="text-fg-dim">{t("macroFat", { value: fmt(meal.estFatG) })}</span>
            <span className="text-fg-faint" aria-hidden>·</span>
            <span className="text-fg-dim">{t("macroPrep", { value: fmt(meal.prepMinutes) })}</span>
          </div>
        </div>
      </div>

      {/* Expandable recipe — full width below the flex container */}
      {open ? (
        <div className="border-t hairline px-5 py-4 space-y-4">
          <section>
            <div className="eyebrow mb-2">{t("ingredients")}</div>
            <ul className="space-y-1 text-copy">
              {meal.ingredients.map((ing, i) => (
                <li key={i} className="flex items-baseline gap-3">
                  <span className="numeric text-fg-dim shrink-0 w-20">
                    {ing.amount} {ing.unit}
                  </span>
                  <span>{ing.name}</span>
                </li>
              ))}
            </ul>
          </section>
          {meal.steps.length > 0 ? (
            <section>
              <div className="eyebrow mb-2">{t("steps")}</div>
              <ol className="space-y-2 text-copy">
                {meal.steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="numeric text-fg-dim shrink-0 w-6">{String(i + 1).padStart(2, "0")}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      ) : null}

      {/* Actions */}
      <div className="border-t hairline px-3 py-2 flex items-center gap-1 flex-wrap">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="btn btn-ghost btn-sm"
          aria-expanded={open}
        >
          {open ? t("hideRecipe") : t("showRecipe")}
        </button>
        {meal.swappable ? (
          <button
            type="button"
            onClick={handleSwap}
            disabled={swapDisabled}
            title={swapExhausted ? t("swapExhaustedTitle") : undefined}
            className="btn btn-ghost btn-sm"
          >
            {pending ? t("swapping") : t("swapShort")}
          </button>
        ) : null}
        {loggable ? (
          <LogMealButton
            mealId={meal.id}
            mealTitle={meal.title}
            slot={meal.slot}
            dateIso={isoToday()}
          />
        ) : null}
      </div>
      {confirmSheet}
    </article>
  );
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}
