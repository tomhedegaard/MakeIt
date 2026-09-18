"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { joinWaitlistAction } from "@/app/waitlist-actions";

/**
 * Access-panel waitlist form (reference B `.form`): `joinWaitlistAction`
 * with a `company` honeypot. The status stays a single
 * `aria-live="polite"` line instead of swapping the whole panel for a
 * "done" card, since this block also carries the eyebrow and the
 * device-compatibility copy above it.
 */
export default function WaitlistForm() {
  const t = useTranslations("Marketing.kalk.access");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<"idle" | "done" | "error">("idle");

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await joinWaitlistAction(formData);
      setState(res.ok ? "done" : "error");
    });
  }

  const done = state === "done";

  return (
    <form action={onSubmit} className="mt-8">
      <label htmlFor="access-email" className="mb-2.5 block font-mono text-xs uppercase tracking-[0.1em] text-fg-dim">
        {t("emailLabel")}
      </label>
      <div className="flex flex-wrap gap-2.5">
        <input
          id="access-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder={t("emailPlaceholder")}
          disabled={done}
          aria-describedby="access-status access-fine"
          className="field h-[52px] min-w-[220px] flex-1"
        />
        {/* Honeypot — hidden from humans, filled by bots. */}
        <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
        <input type="hidden" name="locale" value={locale} />
        <button type="submit" disabled={pending || done} className="btn btn-primary min-h-[52px]">
          {pending ? t("pending") : t("cta")}
        </button>
      </div>
      <p id="access-status" aria-live="polite" className="mt-3 min-h-[1.5em] font-mono text-xs text-fg-dim">
        {state === "done" ? t("done") : state === "error" ? t("error") : ""}
      </p>
      <p id="access-fine" className="mt-1 text-sm text-fg-dim">
        {t("fine")}
      </p>
    </form>
  );
}
