"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { sendWeeklyDigestAction } from "@/app/coach/actions";
import ConfirmSheet from "@/components/ui/ConfirmSheet";

export default function SendDigestButton() {
  const t = useTranslations("Coach.digest");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function send() {
    startTransition(async () => {
      const res = await sendWeeklyDigestAction();
      if (res.ok) {
        const failedSuffix = res.failed > 0 ? t("failedSuffix", { failed: res.failed }) : "";
        setResult(
          res.sent > 0
            ? res.sent === 1
              ? t("sentOne", { sent: res.sent, failedSuffix })
              : t("sentMany", { sent: res.sent, failedSuffix })
            : res.skipped > 0
              ? t("skipped")
              : t("noRecipients")
        );
      } else {
        setResult(t("error"));
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => {
          if (!pending) setConfirmOpen(true);
        }}
        // aria-disabled, not disabled: a disabled button drops focus to
        // <body> right after the sheet hands it back.
        aria-disabled={pending}
      >
        {pending ? t("sending") : t("send")}
      </button>
      <span role="status" aria-live="polite" className="text-meta text-fg-faint">
        {result}
      </span>
      <ConfirmSheet
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("confirm")}
        confirmLabel={t("send")}
        onConfirm={send}
      />
    </div>
  );
}
