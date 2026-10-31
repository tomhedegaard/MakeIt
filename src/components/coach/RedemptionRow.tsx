"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { setRedemptionStatusAction } from "@/app/coach/redemptions/actions";
import type { PendingRedemption } from "@/lib/data/coach";

const STATUS_KEY: Record<PendingRedemption["status"], string> = {
  pending: "statusPending",
  approved: "statusApproved",
  shipped: "statusShipped",
  fulfilled: "statusFulfilled",
  cancelled: "statusCancelled",
};

export default function RedemptionRow({
  redemption,
}: {
  redemption: PendingRedemption;
}) {
  const t = useTranslations("Coach.redemptionRow");
  const [pending, startTransition] = useTransition();

  function go(status: "approved" | "shipped" | "fulfilled" | "cancelled") {
    if (pending) return;
    startTransition(async () => {
      await setRedemptionStatusAction(redemption.id, status);
    });
  }

  return (
    <li className="px-5 py-4 flex flex-wrap items-center gap-3 text-copy">
      <span className="numeric text-micro text-fg-faint w-16 shrink-0">
        {new Date(redemption.redeemedAt).toLocaleDateString("da-DK", {
          day: "numeric",
          month: "short",
        })}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-copy truncate">@{redemption.memberHandle}</div>
        <div className="text-micro text-fg-faint truncate">
          {redemption.rewardName} ·{" "}
          {t("reps", { cost: redemption.costReps.toLocaleString("da-DK") })}
        </div>
      </div>
      <span
        className="text-micro border hairline-strong px-2 py-0.5 shrink-0"
        style={{
          color:
            redemption.status === "approved" ? "var(--fg)" : "var(--fg-dim)",
        }}
      >
        {t(STATUS_KEY[redemption.status])}
      </span>
      <div className="flex gap-1.5 shrink-0">
        {redemption.status === "pending" ? (
          <>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => go("approved")}
              aria-disabled={pending}
            >
              {t("approve")}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => go("cancelled")}
              aria-disabled={pending}
            >
              {t("reject")}
            </button>
          </>
        ) : redemption.status === "approved" ? (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => go("shipped")}
            aria-disabled={pending}
          >
            {t("markShipped")}
          </button>
        ) : null}
      </div>
    </li>
  );
}
