"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { startProgramAction, type StartProgramError } from "./actions";

/**
 * Confirms before swapping the active program. Pausing + reassigning
 * is destructive enough that we want an explicit "yes" — the
 * member's progress on the current program is preserved (status
 * goes 'active' → 'paused', not deleted), but a misclick still
 * resets current_week and breaks streak expectations.
 *
 * Empty blueprints disable the CTA; action failures surface inline
 * so the button never looks dead.
 */
export default function StartProgramButton({
  programId,
  programName,
  hasOtherActive,
  hasDays,
  className,
}: {
  programId: string;
  programName: string;
  hasOtherActive: boolean;
  hasDays: boolean;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<StartProgramError | null>(null);
  const router = useRouter();
  const t = useTranslations("Coaching.startButton");

  function handleClick() {
    if (pending || !hasDays) return;
    const confirmText = hasOtherActive
      ? t("switchConfirm", { name: programName })
      : t("startConfirm", { name: programName });
    if (!confirm(confirmText)) return;

    setError(null);
    startTransition(async () => {
      try {
        const res = await startProgramAction(programId);
        if (!res.ok) {
          setError(res.error ?? "failed");
          return;
        }
        router.refresh();
        router.push("/coaching");
      } catch {
        setError("failed");
      }
    });
  }

  const label = pending
    ? t("starting")
    : hasDays
      ? t("start")
      : t("unavailable");

  return (
    <div className="flex-1 min-w-0 space-y-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending || !hasDays}
        aria-disabled={pending || !hasDays}
        className={className ?? "btn btn-sm w-full"}
      >
        {label}
      </button>
      {error ? (
        <p className="text-[11px] font-mono text-danger" role="alert">
          {t(`errors.${error}`)}
        </p>
      ) : !hasDays ? (
        <p className="text-[11px] font-mono text-fg-dim">{t("emptyDays")}</p>
      ) : null}
    </div>
  );
}
