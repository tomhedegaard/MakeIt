"use client";

import { useState, useTransition } from "react";
import type { Meal, MealSlot } from "@/lib/data/nutrition";
import { swapMealAction } from "./actions";
import LogMealButton from "./LogMealButton";

const SLOT_LABELS: Record<MealSlot, string> = {
  morgen: "Morgen",
  frokost: "Frokost",
  aften: "Aften",
  snack: "Snack",
  pre: "Pre",
  post: "Post",
};

const CARB_DENSITY_LABELS: Record<Meal["carbDensity"], string> = {
  low: "Lav-kulhydrat",
  standard: "Standard",
  high: "Tung træningsdag",
};

export default function MealCard({
  meal,
  loggable,
  compact = false,
}: {
  meal: Meal;
  loggable: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSwap() {
    if (pending) return;
    if (!confirm(`Bytte "${meal.title}" til en anden ${SLOT_LABELS[meal.slot].toLowerCase()}?`)) return;
    const formData = new FormData();
    formData.set("mealId", meal.id);
    startTransition(() => {
      swapMealAction(formData);
    });
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <span className="eyebrow w-16 shrink-0">{SLOT_LABELS[meal.slot]}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm truncate">{meal.title}</div>
          <div className="text-[11px] font-mono text-fg-faint">
            {meal.estKcal ?? "—"} kcal · {meal.estProteinG ?? "—"}g P · {meal.prepMinutes ?? "—"}m
          </div>
        </div>
        {meal.swappable ? (
          <button
            type="button"
            onClick={handleSwap}
            disabled={pending}
            className="btn btn-ghost btn-sm shrink-0"
            aria-label={`Byt ${meal.title}`}
          >
            {pending ? "…" : "Byt"}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <article className="surface-2 rounded-xl overflow-hidden">
      {/* Unsplash hero image — rendered above the title when the
          cache has a match. Click goes to the photographer's profile
          (Unsplash ToS requirement). aspect-[5/3] sits between
          square and 16/9; matches food photography conventions
          without dominating the card vertically. */}
      {meal.imageUrl ? (
        <a
          href={meal.imageAttributionUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block aspect-[5/3] overflow-hidden group"
          aria-label={
            meal.imageAttributionName
              ? `Foto af ${meal.imageAttributionName} på Unsplash`
              : "Foto via Unsplash"
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={meal.imageUrl}
            alt={meal.title}
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
          {meal.imageAttributionName ? (
            <span className="absolute bottom-2 right-2 text-[9px] font-mono uppercase tracking-[0.14em] text-white/85 bg-black/40 backdrop-blur-sm rounded px-1.5 py-0.5">
              📷 {meal.imageAttributionName}
            </span>
          ) : null}
        </a>
      ) : null}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="eyebrow mb-1.5 flex items-center gap-2">
            {SLOT_LABELS[meal.slot]}
            <span className="text-fg-faint" aria-hidden>·</span>
            <span>{CARB_DENSITY_LABELS[meal.carbDensity]}</span>
            {meal.kind === "recipe" ? (
              <>
                <span className="text-fg-faint" aria-hidden>·</span>
                <span className="numeric border hairline-strong rounded-full px-2 py-0.5 text-[10px]">
                  Anker
                </span>
              </>
            ) : null}
          </div>
          <h3 className="font-display text-2xl md:text-3xl leading-[1] mb-1.5">
            {meal.title}
          </h3>
          {meal.description ? (
            <p className="text-fg-dim text-sm leading-relaxed">{meal.description}</p>
          ) : null}
        </div>
        <div className="text-right shrink-0">
          <div className="numeric text-2xl">{meal.estKcal ?? "—"}</div>
          <div className="eyebrow">kcal</div>
        </div>
      </div>

      {/* Macro pills */}
      <div className="px-5 pb-3 flex flex-wrap items-center gap-2 text-[11px] font-mono">
        <span className="text-fg-dim">{meal.estProteinG ?? "—"}g protein</span>
        <span className="text-fg-faint" aria-hidden>·</span>
        <span className="text-fg-dim">{meal.estCarbsG ?? "—"}g kulhydrat</span>
        <span className="text-fg-faint" aria-hidden>·</span>
        <span className="text-fg-dim">{meal.estFatG ?? "—"}g fedt</span>
        <span className="text-fg-faint" aria-hidden>·</span>
        <span className="text-fg-dim">{meal.prepMinutes ?? "—"} min prep</span>
      </div>

      {/* Expandable recipe */}
      {open ? (
        <div className="border-t hairline px-5 py-4 space-y-4">
          <section>
            <div className="eyebrow mb-2">Ingredienser</div>
            <ul className="space-y-1 text-sm">
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
              <div className="eyebrow mb-2">Sådan</div>
              <ol className="space-y-2 text-sm">
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
          {open ? "Skjul opskrift" : "Vis opskrift"}
        </button>
        {meal.swappable ? (
          <button
            type="button"
            onClick={handleSwap}
            disabled={pending}
            className="btn btn-ghost btn-sm"
          >
            {pending ? "Bytter…" : "Byt"}
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
    </article>
  );
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}
