"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("Coaching.startButton");

  function handleClick() {
    if (pending) return;
    const confirmText = hasOtherActive
      ? t("switchConfirm", { name: programName })
      : t("startConfirm", { name: programName });
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
      {pending ? t("starting") : t("start")}
    </button>
  );
}
