"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { DailyCheckIn } from "@/lib/data/nutrition-checkin";
import type { MealSlot } from "@/lib/data/nutrition";
import { quickLogAction } from "@/app/(app)/nutrition/actions";
import LogMealButton from "@/app/(app)/nutrition/LogMealButton";
import StreakCelebration from "@/components/nutrition/StreakCelebration";

const SLOT_LABELS: Record<MealSlot, string> = {
  morgen: "Morgen",
  frokost: "Frokost",
  aften: "Aften",
  snack: "Snack",
  pre: "Pre",
  post: "Post",
};

/**
 * Daily check-in card. Renders only when there's a meal to surface
 * for the active or next slot. Three quick paths:
 *   - "Som planlagt" → quickLog with status=eaten, no photo
 *   - "Med foto"     → opens the existing log sheet (LogMealButton)
 *   - "Skippet"      → quickLog with status=skipped
 *
 * Returns null when state is "no-plan" so the card is a no-op on
 * pages that include it before the member has generated a plan.
 */
export default function DailyCheckInCard({
  checkin,
  variant = "full",
}: {
  checkin: DailyCheckIn;
  /** "compact" drops the meal description for tighter dashboard placement */
  variant?: "full" | "compact";
}) {
  const [pending, startTransition] = useTransition();
  const [celebration, setCelebration] = useState<number | null>(null);

  if (checkin.state === "no-plan" || !checkin.slot) return null;

  // After-aften and other "nothing to log right now" states still
  // surface the streak, since that's the daily-habit signal.
  const isActionable = checkin.state === "due" && checkin.meal !== null;
  const showCelebration = checkin.state === "logged" || checkin.state === "skipped";

  function handleQuickLog(status: "eaten" | "skipped") {
    if (pending || !checkin.slot) return;
    if (status === "skipped" && !confirm("Markér dette måltid som skippet?")) return;
    const fd = new FormData();
    if (checkin.meal?.id) fd.set("mealId", checkin.meal.id);
    fd.set("loggedForDate", checkin.dateIso);
    fd.set("loggedForSlot", checkin.slot);
    fd.set("status", status);
    startTransition(async () => {
      const res = await quickLogAction(fd);
      if (res?.streakMilestone) setCelebration(res.streakMilestone);
    });
  }

  const slotLabel = SLOT_LABELS[checkin.slot];
  const headline = headlineFor(checkin);

  return (
    <>
    <article
      className="surface-2 rounded-2xl overflow-hidden"
      style={{
        borderColor: isActionable ? "var(--line-bright)" : undefined,
      }}
    >
      <div className="px-5 py-4 flex items-start gap-4">
        <span
          aria-hidden
          className={isActionable ? "pulse-dot mt-1.5" : "size-2 rounded-full bg-fg/40 mt-1.5"}
        />
        <div className="flex-1 min-w-0">
          <div className="eyebrow mb-1.5 flex items-center gap-2 flex-wrap">
            <span>Daily check-in</span>
            <span aria-hidden className="text-fg-faint">·</span>
            <span>
              {slotLabel} {checkin.slotWindow ? `· ${checkin.slotWindow}` : ""}
            </span>
            {checkin.mealsToday > 0 ? (
              <>
                <span aria-hidden className="text-fg-faint">·</span>
                <span className="numeric">
                  {checkin.loggedToday}/{checkin.mealsToday} i dag
                </span>
              </>
            ) : null}
          </div>
          <h3 className="font-display text-2xl md:text-3xl leading-[1.05] mb-1">
            {headline}
          </h3>
          {variant === "full" && checkin.meal?.description ? (
            <p className="text-fg-dim text-sm leading-relaxed">
              {checkin.meal.description}
            </p>
          ) : null}
        </div>
        {checkin.streakDays > 0 ? (
          <div className="text-right shrink-0">
            <div className="numeric text-2xl">{checkin.streakDays}</div>
            <div className="eyebrow">streak</div>
            {checkin.nextMilestone ? (
              <div className="mt-1 text-[10px] font-mono text-fg-dim whitespace-nowrap">
                +50 om {checkin.nextMilestone.daysAway}{" "}
                {checkin.nextMilestone.daysAway === 1 ? "dag" : "dage"}
              </div>
            ) : null}
          </div>
        ) : checkin.nextMilestone ? (
          <div className="text-right shrink-0">
            <div className="text-[11px] font-mono text-fg-dim leading-tight">
              Log mad i {checkin.nextMilestone.days} dage
              <br />
              <span className="text-fg">→ +50 Reps</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Macro pill — only when there's a meal to show */}
      {variant === "full" && checkin.meal ? (
        <div className="px-5 pb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono">
          <span className="text-fg-dim">
            {checkin.meal.estKcal ?? "—"} kcal
          </span>
          <span className="text-fg-faint" aria-hidden>·</span>
          <span className="text-fg-dim">
            {checkin.meal.estProteinG ?? "—"}g protein
          </span>
          <span className="text-fg-faint" aria-hidden>·</span>
          <span className="text-fg-dim">
            {checkin.meal.prepMinutes ?? "—"} min prep
          </span>
        </div>
      ) : null}

      {/* Actions */}
      <div className="border-t hairline px-3 py-2 flex items-center gap-1 flex-wrap">
        {isActionable ? (
          <>
            <button
              type="button"
              onClick={() => handleQuickLog("eaten")}
              disabled={pending}
              className="btn btn-primary btn-sm"
            >
              {pending ? "Logger…" : "Som planlagt"}
            </button>
            {checkin.meal ? (
              <LogMealButton
                mealId={checkin.meal.id}
                mealTitle={checkin.meal.title}
                slot={checkin.meal.slot}
                dateIso={checkin.dateIso}
              />
            ) : null}
            <button
              type="button"
              onClick={() => handleQuickLog("skipped")}
              disabled={pending}
              className="btn btn-ghost btn-sm"
            >
              Skippet
            </button>
            <Link href="/nutrition" className="btn btn-ghost btn-sm ml-auto">
              Hele planen →
            </Link>
          </>
        ) : showCelebration ? (
          <>
            <span className="px-3 py-2 text-xs font-mono text-fg-dim">
              {checkin.state === "skipped"
                ? `${slotLabel} skippet — næste check-in venter.`
                : `${slotLabel} logget. Godt arbejde.`}
            </span>
            <Link href="/nutrition" className="btn btn-ghost btn-sm ml-auto">
              Hele planen →
            </Link>
          </>
        ) : (
          <>
            <span className="px-3 py-2 text-xs font-mono text-fg-dim">
              Næste: {slotLabel} {checkin.slotWindow}
            </span>
            <Link href="/nutrition" className="btn btn-ghost btn-sm ml-auto">
              Hele planen →
            </Link>
          </>
        )}
      </div>
    </article>
    <StreakCelebration
      milestone={celebration}
      onClose={() => setCelebration(null)}
    />
    </>
  );
}

function headlineFor(c: DailyCheckIn): string {
  if (!c.slot) return "Intet måltid lige nu.";
  if (c.state === "skipped") return "Skippet.";
  if (c.state === "logged") return c.meal?.title ?? "Logget.";
  if (c.state === "upcoming") {
    return c.meal?.title
      ? `Næste: ${c.meal.title}`
      : `Næste: ${SLOT_LABELS[c.slot]}`;
  }
  // due
  return c.meal?.title ?? "Hvad spiste du?";
}
