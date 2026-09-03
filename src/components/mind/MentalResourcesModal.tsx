"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { escalateMentalSafetyAction } from "@/app/(app)/mind/journal/escalate-actions";

/**
 * Surfaces when the journal moderation pipeline detects a crisis or
 * flagged entry. Livslinien / 112 always stay visible.
 *
 * "Skriv til Munk" stores a member-written summary on
 * mental_safety_alerts when connected mode actually persists. The UI
 * never claims Munk was notified. Demo returns persisted=false.
 */
export default function MentalResourcesModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Unmount the dialog when closed so the next open starts on
  // "resources" without a setState-in-effect reset.
  if (!open) return null;
  return <MentalResourcesDialog onClose={onClose} />;
}

function MentalResourcesDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations("Mind.safety");
  const [mode, setMode] = useState<"resources" | "escalate" | "sent">("resources");
  const [persisted, setPersisted] = useState(false);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    onClose();
  }

  function errorCopy(code: string): string {
    switch (code) {
      case "not_authed":
        return t("errorNotAuthed");
      case "invalid_input":
        return t("errorInvalid");
      case "summary_too_short":
        return t("errorTooShort");
      case "summary_too_long":
        return t("errorTooLong");
      case "rls_denied":
        return t("errorRls");
      case "write_failed":
      case "no_supabase_client":
        return t("errorWrite");
      default:
        return t("errorGeneric");
    }
  }

  function submitEscalation(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await escalateMentalSafetyAction(formData);
      if (res && "error" in res) {
        setError(errorCopy(res.error));
        return;
      }
      setPersisted(res.persisted);
      setMode("sent");
    });
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mental-resources-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <div className="max-w-lg w-full rounded-2xl border hairline bg-bg-2 p-8 space-y-6">
        {mode === "resources" ? (
          <>
            <div>
              <div className="eyebrow mb-3">{t("eyebrow")}</div>
              <h2
                id="mental-resources-title"
                className="font-display text-2xl md:text-3xl"
              >
                {t("title")}
              </h2>
            </div>

            <p className="text-fg-dim leading-relaxed">{t("body")}</p>

            <CrisisLines t={t} />

            <p className="text-fg-dim text-sm">{t("privacy")}</p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMode("escalate")}
                className="inline-flex items-center justify-center rounded-full border hairline px-5 py-2.5 text-sm font-medium hover:bg-bg/30 transition-colors"
              >
                {t("tellMunk")}
              </button>
              <button
                type="button"
                onClick={close}
                className="inline-flex items-center justify-center rounded-full bg-fg text-bg px-7 py-3 text-base font-medium hover:opacity-90 transition-opacity"
              >
                {t("close")}
              </button>
            </div>
          </>
        ) : null}

        {mode === "escalate" ? (
          <form action={submitEscalation} className="space-y-5">
            <div>
              <div className="eyebrow mb-3">{t("escalateEyebrow")}</div>
              <h2
                id="mental-resources-title"
                className="font-display text-2xl md:text-3xl"
              >
                {t("escalateTitle")}
              </h2>
            </div>
            <p className="text-fg-dim text-sm leading-relaxed">{t("escalateBody")}</p>
            <CrisisLines t={t} />
            <textarea
              name="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value.slice(0, 1000))}
              minLength={4}
              maxLength={1000}
              required
              rows={6}
              placeholder={t("escalatePlaceholder")}
              className="w-full rounded-xl bg-bg/60 border hairline px-4 py-3 text-base resize-none focus:outline-none focus:border-fg/40"
            />
            <div className="text-fg-dim text-xs text-right tabular-nums">
              {summary.length} / 1000
            </div>
            {error ? (
              <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            ) : null}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMode("resources")}
                className="text-fg-dim text-sm hover:text-fg"
              >
                {t("back")}
              </button>
              <button
                type="submit"
                disabled={pending || summary.trim().length < 4}
                className="inline-flex items-center justify-center rounded-full bg-fg text-bg px-7 py-3 text-base font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {pending ? t("sending") : t("send")}
              </button>
            </div>
          </form>
        ) : null}

        {mode === "sent" ? (
          <>
            <div>
              <div className="eyebrow mb-3">{t("sentEyebrow")}</div>
              <h2
                id="mental-resources-title"
                className="font-display text-2xl md:text-3xl"
              >
                {persisted ? t("sentTitle") : t("sentDemoTitle")}
              </h2>
            </div>
            <p className="text-fg-dim leading-relaxed">
              {persisted ? t("sentBody") : t("sentDemoBody")}
            </p>
            <CrisisLines t={t} />
            <button
              type="button"
              onClick={close}
              className="inline-flex items-center justify-center rounded-full bg-fg text-bg px-7 py-3 text-base font-medium hover:opacity-90 transition-opacity"
            >
              {t("sentClose")}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function CrisisLines({
  t,
}: {
  t: ReturnType<typeof useTranslations<"Mind.safety">>;
}) {
  return (
    <div className="border-l-2 border-fg/30 pl-5 space-y-1.5">
      <h3 className="eyebrow mb-2">{t("ifBurning")}</h3>
      <p>
        <a href="tel:70201201" className="underline hover:opacity-80">
          {t("livslinien")}
        </a>{" "}
        <span className="text-fg-dim text-sm">{t("livslinienHours")}</span>
      </p>
      <p>
        <a href="tel:112" className="underline hover:opacity-80">
          {t("emergency")}
        </a>
      </p>
      <p className="text-fg-dim">{t("doctor")}</p>
    </div>
  );
}
