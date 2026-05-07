"use client";

import { useTransition } from "react";
import { setRedemptionStatusAction } from "@/app/coach/redemptions/actions";
import type { PendingRedemption } from "@/lib/data/coach";

const STATUS_LABEL: Record<PendingRedemption["status"], string> = {
  pending: "Afventer",
  approved: "Godkendt",
  shipped: "Sendt",
  fulfilled: "Modtaget",
  cancelled: "Annulleret",
};

export default function RedemptionRow({
  redemption,
}: {
  redemption: PendingRedemption;
}) {
  const [pending, startTransition] = useTransition();

  function go(status: "approved" | "shipped" | "fulfilled" | "cancelled") {
    startTransition(async () => {
      await setRedemptionStatusAction(redemption.id, status);
    });
  }

  return (
    <li className="px-5 py-4 flex flex-wrap items-center gap-3 text-sm">
      <span className="numeric text-xs text-fg-faint w-16 shrink-0">
        {new Date(redemption.redeemedAt).toLocaleDateString("da-DK", {
          day: "numeric",
          month: "short",
        })}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">@{redemption.memberHandle}</div>
        <div className="text-[11px] font-mono text-fg-faint truncate">
          {redemption.rewardName} ·{" "}
          {redemption.costReps.toLocaleString("da-DK")} Reps
        </div>
      </div>
      <span
        className="text-[10px] font-mono uppercase tracking-[0.14em] border hairline-strong rounded-full px-2 py-0.5 shrink-0"
        style={{
          color:
            redemption.status === "approved" ? "var(--fg)" : "var(--fg-dim)",
        }}
      >
        {STATUS_LABEL[redemption.status]}
      </span>
      <div className="flex gap-1.5 shrink-0">
        {redemption.status === "pending" ? (
          <>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => go("approved")}
              disabled={pending}
            >
              Godkend
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => go("cancelled")}
              disabled={pending}
            >
              Afvis
            </button>
          </>
        ) : redemption.status === "approved" ? (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => go("shipped")}
            disabled={pending}
          >
            Marker afsendt
          </button>
        ) : null}
      </div>
    </li>
  );
}
