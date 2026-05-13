"use client";

import { useTransition } from "react";
import { generatePlanAction } from "./actions";
import PlanGenerationOverlay from "@/components/nutrition/PlanGenerationOverlay";

export default function GeneratePlanButton({
  label = "Generér ugeplan",
  variant = "primary",
}: {
  label?: string;
  variant?: "primary" | "ghost";
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (pending) return;
    startTransition(() => {
      generatePlanAction();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={
          variant === "primary"
            ? "btn btn-primary"
            : "btn btn-ghost btn-sm"
        }
      >
        {pending ? "Genererer…" : label}
      </button>
      <PlanGenerationOverlay pending={pending} />
    </>
  );
}
