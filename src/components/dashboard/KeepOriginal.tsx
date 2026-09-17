"use client";

import { useOptimistic, useState, useTransition } from "react";
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

  function keep() {
    setState((s) => nextKeepState(s, { type: "submit" }));
    startTransition(async () => {
      setOptimisticKept(true);
      let ok = false;
      try {
        const res = await setAdaptationResponseAction({ modifierId, sessionId, accepted: false });
        ok = res.ok;
      } catch {
        ok = false;
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
