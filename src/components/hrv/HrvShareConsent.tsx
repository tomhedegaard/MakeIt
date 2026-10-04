"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setHrvShareToCoach } from "@/app/(app)/hrv/connect-actions";

/**
 * "Del med coach" (spec §6.3) as explicit consent (0068). Until the member
 * has answered, it asks; afterwards it is a plain on/off switch. Off is the
 * default, and turning it off also hides what was shared before.
 */
export default function HrvShareConsent({
  initialShare,
  decided,
}: {
  initialShare: boolean;
  decided: boolean;
}) {
  const t = useTranslations("Hrv.share");
  const [share, setShare] = useState(initialShare);
  const [answered, setAnswered] = useState(decided);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function save(next: boolean) {
    const before = { share, answered };
    setShare(next);
    setAnswered(true);
    setError(false);
    startTransition(async () => {
      const res = await setHrvShareToCoach(next);
      if (!res.ok) {
        setShare(before.share);
        setAnswered(before.answered);
        setError(true);
      }
    });
  }

  if (!answered) {
    return (
      <section aria-labelledby="hrv-share-q" className="surface-2 p-5 border-line-strong">
        <h2 id="hrv-share-q" className="font-display text-section">{t("question")}</h2>
        <p className="mt-2 text-copy text-fg-body">{t("body")}</p>
        <p className="mt-2 text-meta text-fg-dim">{t("revoke")}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className="btn btn-primary" disabled={pending} onClick={() => save(true)}>
            {t("yes")}
          </button>
          <button type="button" className="btn" disabled={pending} onClick={() => save(false)}>
            {t("notNow")}
          </button>
        </div>
        {error ? <p role="alert" className="mt-3 text-meta text-danger">{t("error")}</p> : null}
      </section>
    );
  }

  return (
    <section aria-label={t("label")} className="surface-2 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-copy text-fg">{t("label")}</p>
          <p className="mt-1 text-meta text-fg-dim">{share ? t("onHint") : t("offHint")}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={share}
          aria-label={t("label")}
          disabled={pending}
          onClick={() => save(!share)}
          className={`relative h-7 w-12 shrink-0 border transition-colors duration-200 ease-out ${
            share ? "bg-fg border-fg" : "bg-bg border-line-strong"
          }`}
        >
          <span
            aria-hidden
            className={`absolute left-0 top-0.5 size-6 border transition-transform duration-200 ease-out motion-reduce:transition-none ${
              share ? "translate-x-5 bg-bg border-bg" : "translate-x-0.5 bg-bg border-line-strong"
            }`}
          />
        </button>
      </div>
      {error ? <p role="alert" className="mt-3 text-meta text-danger">{t("error")}</p> : null}
    </section>
  );
}
