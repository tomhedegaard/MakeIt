"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sheet, SheetContent } from "@/components/ui/Sheet";
import { redeemRewardAction } from "./actions";
import type { Reward } from "@/lib/data/rewards";

type Stage = "confirm" | "success" | "error";

export default function RedeemButton({
  reward,
  balance,
}: {
  reward: Reward;
  balance: number;
}) {
  const t = useTranslations("Reps.redeem");
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("confirm");
  const [errorReason, setErrorReason] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function errorLabel(reason: string | undefined): string {
    const key = `errors.${reason ?? "unknown"}`;
    return t.has(key) ? t(key) : t("errors.unknown");
  }

  const canAfford = balance >= reward.costReps;
  const disabled = !reward.isAvailable || !canAfford;

  function open_() {
    setStage("confirm");
    setErrorReason("");
    setOpen(true);
  }

  function close_() {
    setOpen(false);
    if (stage === "success") router.refresh();
  }

  function confirm() {
    startTransition(async () => {
      const res = await redeemRewardAction(reward.id);
      if (res.ok) {
        setStage("success");
      } else {
        setStage("error");
        setErrorReason(errorLabel(res.reason));
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className={`btn btn-sm mt-5 w-full ${canAfford && reward.isAvailable ? "btn-primary" : ""}`}
        onClick={open_}
        disabled={disabled}
      >
        {!reward.isAvailable
          ? t("soldOut")
          : !canAfford
            ? t("missingReps", {
                amount: (reward.costReps - balance).toLocaleString("da-DK"),
              })
            : t("redeem")}
      </button>

      <Sheet open={open} onOpenChange={(v) => (v ? setOpen(true) : close_())}>
        <SheetContent>
          {stage === "confirm" ? (
            <>
              <div className="eyebrow mb-2">{t("confirmEyebrow")}</div>
              <h2 className="font-display text-2xl mb-2">{reward.name}</h2>
              {reward.description ? (
                <p className="text-fg-dim text-sm mb-5">{reward.description}</p>
              ) : null}

              <div className="surface-2 rounded-lg p-4 mb-5">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-fg-dim text-sm">{t("price")}</span>
                  <span className="numeric text-lg">
                    {reward.costReps.toLocaleString("da-DK")}{" "}
                    <span className="text-fg-dim text-xs">Reps</span>
                  </span>
                </div>
                <div className="flex items-baseline justify-between mb-3 border-t hairline pt-3">
                  <span className="text-fg-dim text-sm">{t("yourBalance")}</span>
                  <span className="numeric text-lg">
                    {balance.toLocaleString("da-DK")}
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-t hairline-strong pt-3">
                  <span className="text-fg text-sm">{t("afterRedemption")}</span>
                  <span className="numeric text-lg">
                    {(balance - reward.costReps).toLocaleString("da-DK")}{" "}
                    <span className="text-fg-dim text-xs">Reps</span>
                  </span>
                </div>
              </div>

              <p className="text-xs font-mono text-fg-faint mb-5">
                {reward.kind === "physical" || reward.kind === "drop"
                  ? t("fulfilmentPhysical")
                  : reward.kind === "experience"
                    ? t("fulfilmentExperience")
                    : t("fulfilmentDigital")}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="btn"
                  onClick={close_}
                  disabled={pending}
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={confirm}
                  disabled={pending}
                >
                  {pending ? t("redeeming") : t("confirm")}
                </button>
              </div>
            </>
          ) : null}

          {stage === "success" ? (
            <div className="text-center py-2">
              <div className="eyebrow mb-3">{t("successEyebrow")}</div>
              <h2 className="font-display text-3xl mb-2">{t("successTitle")}</h2>
              <p className="text-fg-dim text-sm mb-6 px-2">
                {t("successBody")}
              </p>

              <div className="surface-2 rounded-lg p-4 text-left mb-6">
                <div className="font-display text-lg">{reward.name}</div>
                <div className="text-xs font-mono text-fg-faint mt-1">
                  {t("successMeta", {
                    amount: reward.costReps.toLocaleString("da-DK"),
                  })}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary w-full"
                onClick={close_}
              >
                {t("done")}
              </button>
            </div>
          ) : null}

          {stage === "error" ? (
            <div className="text-center py-2">
              <div className="eyebrow mb-3">{t("errorEyebrow")}</div>
              <h2 className="font-display text-2xl mb-2">{errorReason}</h2>
              <p className="text-fg-dim text-sm mb-6">
                {t("errorBody")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" className="btn" onClick={close_}>
                  {t("close")}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setStage("confirm")}
                >
                  {t("retry")}
                </button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
