"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { generatePlanAction } from "./actions";
import PlanGenerationOverlay from "@/components/nutrition/PlanGenerationOverlay";

export default function GeneratePlanButton({
  label,
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
  const t = useTranslations("Nutrition.generateButton");
  const resolvedLabel = label ?? t("default");
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
            ? t("exhaustedTitle", {
                resetSuffix: quotaResetLabel
                  ? t("exhaustedTitleSuffix", { reset: quotaResetLabel })
                  : "",
              })
            : undefined
        }
        className={
          variant === "primary"
            ? "btn btn-primary"
            : "btn btn-ghost btn-sm"
        }
      >
        {pending
          ? t("generating")
          : exhausted
          ? t("exhausted", {
              resetSuffix: quotaResetLabel
                ? t("exhaustedSuffix", { reset: quotaResetLabel })
                : "",
            })
          : quotaRemaining !== undefined
          ? t("withQuota", { label: resolvedLabel, remaining: quotaRemaining })
          : resolvedLabel}
      </button>
      <PlanGenerationOverlay pending={pending} />
    </>
  );
}
