"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { intlLocaleTag } from "@/i18n/config";
import { Sheet, SheetContent } from "@/components/ui/Sheet";
import SectionHeader from "@/components/ui/SectionHeader";
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
  const tShop = useTranslations("Reps.shop");
  const tag = intlLocaleTag(useLocale());
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
      {/* Only a real action looks like a button; a shortfall is a fact. */}
      {!reward.isAvailable || !canAfford ? (
        <p className="mt-5 min-h-9 flex items-center text-meta text-fg-dim">
          {!reward.isAvailable
            ? t("soldOut")
            : t("missingReps", {
                amount: (reward.costReps - balance).toLocaleString(tag),
              })}
        </p>
      ) : (
        <button
          type="button"
          className="btn btn-primary btn-sm mt-5 w-full"
          onClick={open_}
        >
          {t("redeem")}
        </button>
      )}

      <Sheet open={open} onOpenChange={(v) => (v ? setOpen(true) : close_())}>
        <SheetContent>
          {stage === "confirm" ? (
            <>
              <SectionHeader eyebrow={t("confirmEyebrow")} title={reward.name} />
              {reward.description ? (
                <p className="text-fg-dim text-meta mb-5">{reward.description}</p>
              ) : null}

              <div className="surface-2 rounded-lg p-4 mb-5">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-fg-dim text-meta">{t("price")}</span>
                  <span className="numeric text-card">
                    {reward.costReps.toLocaleString(tag)}{" "}
                    <span className="text-fg-dim text-micro">{tShop("repsLabel")}</span>
                  </span>
                </div>
                <div className="flex items-baseline justify-between mb-3 border-t hairline pt-3">
                  <span className="text-fg-dim text-meta">{t("yourBalance")}</span>
                  <span className="numeric text-card">
                    {balance.toLocaleString(tag)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-t hairline-strong pt-3">
                  <span className="text-fg text-copy">{t("afterRedemption")}</span>
                  <span className="numeric text-card">
                    {(balance - reward.costReps).toLocaleString(tag)}{" "}
                    <span className="text-fg-dim text-micro">{tShop("repsLabel")}</span>
                  </span>
                </div>
              </div>

              <p className="text-meta text-fg-faint mb-5">
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
              <SectionHeader eyebrow={t("successEyebrow")} title={t("successTitle")} className="justify-center" />
              <p className="text-fg-dim text-meta mb-6 px-2">
                {t("successBody")}
              </p>

              <div className="surface-2 rounded-lg p-4 text-left mb-6">
                <div className="font-display text-card">{reward.name}</div>
                <div className="text-micro text-fg-faint mt-1">
                  {t("successMeta", {
                    amount: reward.costReps.toLocaleString(tag),
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
              <SectionHeader eyebrow={t("errorEyebrow")} title={errorReason} className="justify-center" />
              <p className="text-fg-dim text-meta mb-6">
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
