"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import SectionHeader from "@/components/ui/SectionHeader";
import { Modal } from "@/components/ui/Modal";
import { useYouth } from "@/components/youth/YouthContext";
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
  guardianNotified = false,
}: {
  open: boolean;
  onClose: () => void;
  /** MakeIt Ung: the guardian has been told (spec afsnit 5). */
  guardianNotified?: boolean;
}) {
  const t = useTranslations("Mind.safety");
  // Radix Dialog (ui/Modal): focus is trapped, Escape closes, and the
  // content unmounts when closed, so the next open starts on "resources"
  // without a setState-in-effect reset.
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t("title")}
      description={t("body")}
    >
      <MentalResourcesDialog
        onClose={onClose}
        guardianNotified={guardianNotified}
      />
    </Modal>
  );
}

function MentalResourcesDialog({
  onClose,
  guardianNotified,
}: {
  onClose: () => void;
  guardianNotified: boolean;
}) {
  const t = useTranslations("Mind.safety");
  // MakeIt Ung has no coach contact with minors (Toms beslutning 4), so
  // "Skriv til Munk" is not offered; the young member is told plainly
  // when their guardian has been sent a notice.
  const youth = useYouth();
  const [mode, setMode] = useState<"resources" | "escalate" | "sent">(
    "resources",
  );
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

  return (
    <div className="space-y-6">
      {mode === "resources" ? (
        <>
          <SectionHeader
            id="mental-resources-title"
            eyebrow={t("eyebrow")}
            title={t("title")}
          />

          <p className="text-fg-dim leading-relaxed">{t("body")}</p>

          <CrisisLines t={t} />

          {youth && guardianNotified ? (
            <p className="text-fg leading-relaxed" data-guardian-notified>
              {t("youthNotified")}
            </p>
          ) : null}

          <p className="text-fg-dim text-meta">
            {youth ? t("youthPrivacy") : t("privacy")}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {youth ? null : (
              <button
                type="button"
                onClick={() => setMode("escalate")}
                className="btn"
              >
                {t("tellMunk")}
              </button>
            )}
            <button type="button" onClick={close} className="btn btn-primary">
              {t("close")}
            </button>
          </div>
        </>
      ) : null}

      {mode === "escalate" ? (
        <form action={submitEscalation} className="space-y-5">
          <SectionHeader
            id="mental-resources-title"
            eyebrow={t("escalateEyebrow")}
            title={t("escalateTitle")}
          />
          <p className="text-fg-dim text-copy leading-relaxed">
            {t("escalateBody")}
          </p>
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
            className="input w-full text-copy resize-none"
          />
          <div className="text-fg-dim text-micro text-right tabular">
            {summary.length} / 1000
          </div>
          {error ? (
            <div
              role="alert"
              className="border border-danger/30 bg-danger/5 px-4 py-3 text-copy text-danger"
            >
              {error}
            </div>
          ) : null}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setMode("resources")}
              className="btn btn-ghost"
            >
              {t("back")}
            </button>
            <button
              type="submit"
              disabled={pending || summary.trim().length < 4}
              className="btn btn-primary disabled:opacity-40"
            >
              {pending ? t("sending") : t("send")}
            </button>
          </div>
        </form>
      ) : null}

      {mode === "sent" ? (
        <>
          <SectionHeader
            id="mental-resources-title"
            eyebrow={t("sentEyebrow")}
            title={persisted ? t("sentTitle") : t("sentDemoTitle")}
          />
          <p className="text-fg-dim leading-relaxed">
            {persisted ? t("sentBody") : t("sentDemoBody")}
          </p>
          <CrisisLines t={t} />
          <button type="button" onClick={close} className="btn btn-primary">
            {t("sentClose")}
          </button>
        </>
      ) : null}
    </div>
  );
}

function CrisisLines({
  t,
}: {
  t: ReturnType<typeof useTranslations<"Mind.safety">>;
}) {
  const youth = useYouth();
  return (
    <div className="border-l hairline-strong pl-5 space-y-1.5">
      <h3 className="eyebrow mb-2">{t("ifBurning")}</h3>
      {youth ? (
        <>
          <p>
            <a href="tel:116111" className="underline hover:opacity-80">
              {t("youthBornetelefonen")}
            </a>
          </p>
          <p>
            <a
              href="https://headspace.dk"
              className="underline hover:opacity-80"
            >
              {t("youthHeadspace")}
            </a>
          </p>
        </>
      ) : null}
      <p>
        <a href="tel:70201201" className="underline hover:opacity-80">
          {t("livslinien")}
        </a>{" "}
        <span className="text-fg-dim text-meta">{t("livslinienHours")}</span>
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
