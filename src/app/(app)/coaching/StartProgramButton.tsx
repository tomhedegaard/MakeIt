"use client";

import { useTransition } from "react";
import { startProgramAction } from "./actions";

/**
 * Confirms before swapping the active program. Pausing + reassigning
 * is destructive enough that we want an explicit "yes" — the
 * member's progress on the current program is preserved (status
 * goes 'active' → 'paused', not deleted), but a misclick still
 * resets current_week and breaks streak expectations.
 */
export default function StartProgramButton({
  programId,
  programName,
  hasOtherActive,
  className,
}: {
  programId: string;
  programName: string;
  hasOtherActive: boolean;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (pending) return;
    const confirmText = hasOtherActive
      ? `Skifte til "${programName}"? Dit nuværende program pauses (kan genoptages senere).`
      : `Start "${programName}"?`;
    if (!confirm(confirmText)) return;

    const fd = new FormData();
    fd.set("programId", programId);
    startTransition(() => {
      startProgramAction(fd);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={className ?? "btn btn-sm flex-1"}
    >
      {pending ? "Starter…" : "Start program"}
    </button>
  );
}
