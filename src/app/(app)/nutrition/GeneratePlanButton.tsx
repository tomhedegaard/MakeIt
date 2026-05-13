"use client";

import { useTransition } from "react";
import { generatePlanAction } from "./actions";
import PlanGenerationOverlay from "@/components/nutrition/PlanGenerationOverlay";

export default function GeneratePlanButton({
  label = "Generér ugeplan",
  variant = "primary",
  quotaRemaining,
  quotaResetLabel,
}: {
  label?: string;
  variant?: "primary" | "ghost";
  /** Number of plan-regen calls left in the more-constraining window (day or week). */
  quotaRemaining?: number;
  /** Human-friendly "available again i morgen" string when exhausted. */
  quotaResetLabel?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const exhausted = quotaRemaining !== undefined && quotaRemaining <= 0;

  function handleClick() {
    if (pending || exhausted) return;
    startTransition(() => {
      generatePlanAction();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending || exhausted}
        title={
          exhausted
            ? `Ugentlig grænse nået${quotaResetLabel ? ` — næste ${quotaResetLabel}` : ""}`
            : undefined
        }
        className={
          variant === "primary"
            ? "btn btn-primary"
            : "btn btn-ghost btn-sm"
        }
      >
        {pending
          ? "Genererer…"
          : exhausted
          ? `Grænse nået${quotaResetLabel ? ` · næste ${quotaResetLabel}` : ""}`
          : quotaRemaining !== undefined
          ? `${label} (${quotaRemaining} tilbage)`
          : label}
      </button>
      <PlanGenerationOverlay pending={pending} />
    </>
  );
}
