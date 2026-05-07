"use client";

import { useState, useTransition } from "react";
import { sendWeeklyDigestAction } from "@/app/coach/actions";

export default function SendDigestButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function send() {
    if (!confirm("Send ugentlig digest til alle medlemmer med email på fil?")) return;
    startTransition(async () => {
      const res = await sendWeeklyDigestAction();
      if (res.ok) {
        setResult(
          res.sent > 0
            ? `Sendt til ${res.sent} medlem${res.sent === 1 ? "" : "mer"}${res.failed > 0 ? ` (${res.failed} fejl)` : ""}`
            : res.skipped > 0
              ? "Demo / Resend ikke konfigureret — intet sendt."
              : "Ingen modtagere."
        );
      } else {
        setResult("Kunne ikke sende — kun coaches har adgang.");
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
        {pending ? "Sender…" : "Send ugentlig digest"}
      </button>
      {result ? (
        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
          {result}
        </span>
      ) : null}
    </div>
  );
}
