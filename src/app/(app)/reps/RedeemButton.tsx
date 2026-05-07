"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent } from "@/components/ui/Sheet";
import { redeemRewardAction, type RedeemResult } from "./actions";
import type { Reward } from "@/lib/data/rewards";

const ERROR_LABEL: Record<
  Exclude<RedeemResult, { ok: true }>["reason"],
  string
> = {
  auth: "Du skal være logget ind.",
  sold_out: "Den her er udsolgt — det går stærkt!",
  insufficient_reps: "Du har ikke nok Reps endnu.",
  unavailable: "Belønningen er ikke tilgængelig lige nu.",
  unknown: "Noget gik galt — prøv igen om lidt.",
};

type Stage = "confirm" | "success" | "error";

export default function RedeemButton({
  reward,
  balance,
}: {
  reward: Reward;
  balance: number;
}) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("confirm");
  const [errorReason, setErrorReason] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

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
        setErrorReason(ERROR_LABEL[res.reason] ?? ERROR_LABEL.unknown);
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
          ? "Udsolgt"
          : !canAfford
            ? `Mangler ${(reward.costReps - balance).toLocaleString("da-DK")} Reps`
            : "Indløs"}
      </button>

      <Sheet open={open} onOpenChange={(v) => (v ? setOpen(true) : close_())}>
        <SheetContent>
          {stage === "confirm" ? (
            <>
              <div className="eyebrow mb-2">Bekræft indløsning</div>
              <h2 className="font-display text-2xl mb-2">{reward.name}</h2>
              {reward.description ? (
                <p className="text-fg-dim text-sm mb-5">{reward.description}</p>
              ) : null}

              <div className="surface-2 rounded-lg p-4 mb-5">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-fg-dim text-sm">Pris</span>
                  <span className="numeric text-lg">
                    {reward.costReps.toLocaleString("da-DK")}{" "}
                    <span className="text-fg-dim text-xs">Reps</span>
                  </span>
                </div>
                <div className="flex items-baseline justify-between mb-3 border-t hairline pt-3">
                  <span className="text-fg-dim text-sm">Din balance</span>
                  <span className="numeric text-lg">
                    {balance.toLocaleString("da-DK")}
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-t hairline-strong pt-3">
                  <span className="text-fg text-sm">Efter indløsning</span>
                  <span className="numeric text-lg">
                    {(balance - reward.costReps).toLocaleString("da-DK")}{" "}
                    <span className="text-fg-dim text-xs">Reps</span>
                  </span>
                </div>
              </div>

              <p className="text-xs font-mono text-fg-faint mb-5">
                {reward.kind === "physical" || reward.kind === "drop"
                  ? "Vi sender med GLS når Mikael har bekræftet."
                  : reward.kind === "experience"
                    ? "Mikael kontakter dig direkte for at booke."
                    : "Aktiveres automatisk på din konto."}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="btn"
                  onClick={close_}
                  disabled={pending}
                >
                  Annullér
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={confirm}
                  disabled={pending}
                >
                  {pending ? "Indløser…" : "Bekræft →"}
                </button>
              </div>
            </>
          ) : null}

          {stage === "success" ? (
            <div className="text-center py-2">
              <div className="eyebrow mb-3">Indløsning bekræftet</div>
              <h2 className="font-display text-3xl mb-2">Sådan.</h2>
              <p className="text-fg-dim text-sm mb-6 px-2">
                Din indløsning er registreret og venter på Mikaels bekræftelse.
                Du kan følge status under &ldquo;Mine indløsninger&rdquo; nedenfor.
              </p>

              <div className="surface-2 rounded-lg p-4 text-left mb-6">
                <div className="font-display text-lg">{reward.name}</div>
                <div className="text-xs font-mono text-fg-faint mt-1">
                  − {reward.costReps.toLocaleString("da-DK")} Reps · status:
                  afventer
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary w-full"
                onClick={close_}
              >
                Færdig
              </button>
            </div>
          ) : null}

          {stage === "error" ? (
            <div className="text-center py-2">
              <div className="eyebrow mb-3">Kunne ikke indløse</div>
              <h2 className="font-display text-2xl mb-2">{errorReason}</h2>
              <p className="text-fg-dim text-sm mb-6">
                Ingen Reps er trukket. Prøv igen, eller kontakt support hvis
                problemet fortsætter.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" className="btn" onClick={close_}>
                  Luk
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setStage("confirm")}
                >
                  Prøv igen
                </button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
