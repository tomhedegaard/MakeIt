"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { setAdaptationResponseAction } from "@/app/(app)/session/[id]/actions";

export type KeepState = "idle" | "pending" | "kept" | "error";
export type KeepEvent = { type: "submit" } | { type: "result"; ok: boolean };

/**
 * Pure state step for the keep-original button. A successful answer is
 * remembered locally: demo mode persists nothing, so the `accepted`
 * prop stays null and the button would otherwise come back.
 */
export function nextKeepState(_prev: KeepState, event: KeepEvent): KeepState {
  if (event.type === "submit") return "pending";
  return event.ok ? "kept" : "error";
}

/**
 * Double-submit guard: the first call claims the in-flight slot, a
 * second fast click before React re-renders the disabled button is
 * dropped.
 */
export function claimKeepSubmit(inFlight: { current: boolean }): boolean {
  if (inFlight.current) return false;
  inFlight.current = true;
  return true;
}

type Props = {
  modifierId: string;
  sessionId: string;
  accepted: boolean | null;
};

/** C1: "Behold original" straight on today's session card. */
export default function KeepOriginal({ modifierId, sessionId, accepted }: Props) {
  const t = useTranslations("Dashboard.todaySession");
  const [state, setState] = useState<KeepState>(accepted === false ? "kept" : "idle");
  const [optimisticKept, setOptimisticKept] = useOptimistic<boolean, boolean>(
    false,
    (_current, next) => next,
  );
  const [isPending, startTransition] = useTransition();
  const inFlight = useRef(false);

  function keep() {
    if (!claimKeepSubmit(inFlight)) return;
    setState((s) => nextKeepState(s, { type: "submit" }));
    startTransition(async () => {
      setOptimisticKept(true);
      let ok = false;
      try {
        const res = await setAdaptationResponseAction({ modifierId, sessionId, accepted: false });
        ok = res.ok;
      } catch {
        ok = false;
      } finally {
        inFlight.current = false;
      }
      startTransition(() => {
        setState((s) => nextKeepState(s, { type: "result", ok }));
      });
    });
  }

  if (accepted === false || state === "kept" || optimisticKept) {
    return (
      <p role="status" className="text-sm text-fg-dim">
        {t("keptOriginal")}
      </p>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={isPending}
        onClick={keep}
      >
        {t("keepOriginal")}
      </button>
      {state === "error" ? (
        <p role="alert" className="text-sm text-fg-dim">
          {t("keepOriginalError")}
        </p>
      ) : null}
    </div>
  );
}
