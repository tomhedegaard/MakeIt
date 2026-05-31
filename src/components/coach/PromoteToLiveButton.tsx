"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { promoteToLiveAction } from "@/app/(app)/coach-school/actions";

/**
 * CC-7 — client-side "Promote to live" trigger on the /coach/co-coaches surface.
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §7
 *
 * Calls promoteToLiveAction (built in CC-5) which:
 *   1. Flips members.coach_tier from 'beast_sandbox' → 'beast_live'.
 *   2. Auto-creates up to 3 co_coach_assignments via the random-but-
 *      deterministic picker.
 *
 * The button is hidden until the Beast clears the rolling-agreement
 * gate (`liveReady` is computed by the data fetcher — 0.80 threshold
 * over the last 50 sandbox reviews). When `liveReady` is false we
 * render a disabled chip with a hint so Munk sees the gate exists.
 *
 * On success the page is revalidated by the server action
 * (revalidatePath('/coach/co-coaches')), so the row will repaint
 * without the promoted Beast.
 */
export default function PromoteToLiveButton({
  beastMemberId,
  beastHandle,
  liveReady,
}: {
  beastMemberId: string;
  beastHandle: string;
  liveReady: boolean;
}) {
  const t = useTranslations("Coach.coCoaches");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    | { kind: "ok"; assigned: number }
    | { kind: "error"; reason: string }
    | null
  >(null);

  function promote() {
    if (!liveReady || pending) return;
    if (!confirm(t("confirmPromote", { handle: beastHandle }))) return;
    setResult(null);
    startTransition(async () => {
      const res = await promoteToLiveAction({ beastMemberId });
      if (res.ok) {
        setResult({ kind: "ok", assigned: res.assignedMemberIds?.length ?? 0 });
      } else {
        setResult({ kind: "error", reason: res.reason ?? "unknown" });
      }
    });
  }

  if (result?.kind === "ok") {
    return (
      <span
        className="text-xs font-mono uppercase tracking-[0.14em] text-fg-dim"
        aria-live="polite"
      >
        {t("promotedConfirmation", { assigned: result.assigned })}
      </span>
    );
  }

  if (!liveReady) {
    return (
      <span
        className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint"
        title={t("notReadyHint")}
      >
        {t("notReadyLabel")}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="btn btn-sm btn-primary"
        onClick={promote}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? t("promoting") : t("promoteButton")}
      </button>
      {result?.kind === "error" ? (
        <span
          className="text-[10px] font-mono uppercase tracking-[0.14em] text-red-400"
          role="alert"
        >
          {t("promoteError", { reason: result.reason })}
        </span>
      ) : null}
    </div>
  );
}
