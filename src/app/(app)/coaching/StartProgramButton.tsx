"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  isNextRedirectError,
  startProgramDetail,
} from "@/lib/programs/start-program-error";
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

type StartTrace = "calling" | "ok" | null;

/**
 * Confirms before swapping the active program. Pausing + reassigning
 * is destructive enough that we want an explicit "yes" — the
 * member's progress on the current program is preserved (status
 * goes 'active' → 'paused', not deleted), but a misclick still
 * resets current_week and breaks streak expectations.
 *
 * Confirm is an inline second step, never a native dialog. Automated
 * browsers (and some in-app webviews) auto-dismiss those dialogs,
 * which made Start look like a silent no-op: first click returned
 * before `setTrace("calling")`.
 *
 * Empty blueprints disable the CTA. Pending is explicit `useState`
 * for the full async server call — a transition's isPending drops
 * after the first await, so the spinner died before the write
 * finished. Failures always render a filled alert under the button
 * so Start never looks like a silent no-op.
 *
 * Do not call `t.has` here. next-intl ^4.12 documents `t.has`, but a
 * missing method on the client translator throws during error paint,
 * React remounts the button, and Testy sees a short spinner then
 * silence. Known `StartProgramError` keys exist in da/en Coaching.
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
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<StartProgramError | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [trace, setTrace] = useState<StartTrace>(null);
  const router = useRouter();
  const t = useTranslations("Coaching.startButton");

  function errorLabel(code: StartProgramError): string {
    return t(`errors.${code}`);
  }

  const confirmText = hasOtherActive
    ? t("switchConfirm", { name: programName })
    : t("startConfirm", { name: programName });

  function handleStartClick() {
    if (pending || !hasDays) return;
    setError(null);
    setDetail(null);
    setTrace(null);
    setConfirming(true);
  }

  function handleCancel() {
    if (pending) return;
    setConfirming(false);
    setError(null);
    setDetail(null);
    setTrace(null);
  }

  async function handleConfirm() {
    if (pending || !hasDays) return;

    setError(null);
    setDetail(null);
    setTrace("calling");
    setPending(true);
    setConfirming(false);
    try {
      const res = await startProgramAction(programId);
      if (!res.ok) {
        setError(isStartProgramError(res.error) ? res.error : "failed");
        setDetail(res.detail?.trim() ? res.detail.trim() : null);
        setTrace(null);
        return;
      }
      setTrace("ok");
      router.refresh();
      router.push("/coaching");
    } catch (err) {
      if (isNextRedirectError(err)) throw err;
      console.error("[StartProgramButton] startProgramAction failed", err);
      setError("failed");
      setDetail(startProgramDetail(err));
      setTrace(null);
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
      {confirming && !pending ? (
        <div className="space-y-2">
          <p className="text-[11px] font-mono text-fg-dim">{confirmText}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!hasDays}
              className={className ?? "btn btn-sm flex-1 min-w-0"}
            >
              {hasOtherActive ? t("confirmSwitch") : t("confirmStart")}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-ghost btn-sm shrink-0"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleStartClick}
          disabled={pending || !hasDays}
          aria-busy={pending}
          aria-disabled={pending || !hasDays}
          className={className ?? "btn btn-sm w-full"}
        >
          {label}
        </button>
      )}
      {trace === "calling" ? (
        <p className="text-[11px] font-mono text-fg-dim">{t("status.calling")}</p>
      ) : null}
      {trace === "ok" ? (
        <p className="text-[11px] font-mono text-ok">{t("status.ok")}</p>
      ) : null}
      {error ? (
        <p
          className="rounded-md border border-danger/40 bg-danger/15 px-2 py-1 text-[11px] font-mono text-danger"
          role="alert"
        >
          <span>{errorLabel(error)}</span>
          {detail ? (
            <span className="mt-0.5 block break-words text-fg-dim">{detail}</span>
          ) : null}
        </p>
      ) : !hasDays ? (
        <p className="text-[11px] font-mono text-fg-dim">{t("emptyDays")}</p>
      ) : null}
    </div>
  );
}
