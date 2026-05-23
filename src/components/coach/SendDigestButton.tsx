"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { sendWeeklyDigestAction } from "@/app/coach/actions";

export default function SendDigestButton() {
  const t = useTranslations("Coach.digest");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function send() {
    if (!confirm(t("confirm"))) return;
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
        onClick={send}
        disabled={pending}
      >
        {pending ? t("sending") : t("send")}
      </button>
      {result ? (
        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
          {result}
        </span>
      ) : null}
    </div>
  );
}
