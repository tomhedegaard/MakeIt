"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { startProgramAction, type StartProgramError } from "./actions";

const START_PROGRAM_ERRORS = [
  "empty_days",
  "not_allowed",
  "not_found",
  "unavailable",
  "failed",
] as const satisfies readonly StartProgramError[];

function isStartProgramError(value: unknown): value is StartProgramError {
  return (
    typeof value === "string" &&
    (START_PROGRAM_ERRORS as readonly string[]).includes(value)
  );
}

/**
 * Confirms before swapping the active program. Pausing + reassigning
 * is destructive enough that we want an explicit "yes" — the
 * member's progress on the current program is preserved (status
 * goes 'active' → 'paused', not deleted), but a misclick still
 * resets current_week and breaks streak expectations.
 *
 * Empty blueprints disable the CTA. Pending is explicit `useState`
 * for the full async server call — a transition's isPending drops
 * after the first await, so the spinner died before the write
 * finished. Failures always render a filled alert under the button
 * so Start never looks like a silent no-op.
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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<StartProgramError | null>(null);
  const router = useRouter();
  const t = useTranslations("Coaching.startButton");

  function errorLabel(code: StartProgramError): string {
    const key = `errors.${code}`;
    return t.has(key) ? t(key) : t("errors.failed");
  }

  async function handleClick() {
    if (pending || !hasDays) return;
    const confirmText = hasOtherActive
      ? t("switchConfirm", { name: programName })
      : t("startConfirm", { name: programName });
    if (!confirm(confirmText)) return;

    setError(null);
    setPending(true);
    try {
      const res = await startProgramAction(programId);
      if (!res.ok) {
        setError(isStartProgramError(res.error) ? res.error : "failed");
        return;
      }
      router.refresh();
      router.push("/coaching");
    } catch (err) {
      console.error("[StartProgramButton] startProgramAction failed", err);
      setError("failed");
    } finally {
      setPending(false);
    }
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
        aria-busy={pending}
        aria-disabled={pending || !hasDays}
        className={className ?? "btn btn-sm w-full"}
      >
        {label}
      </button>
      {error ? (
        <p
          className="rounded-md border border-danger/40 bg-danger/15 px-2 py-1 text-[11px] font-mono text-danger"
          role="alert"
        >
          {errorLabel(error)}
        </p>
      ) : !hasDays ? (
        <p className="text-[11px] font-mono text-fg-dim">{t("emptyDays")}</p>
      ) : null}
    </div>
  );
}
