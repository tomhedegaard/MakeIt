"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import Container from "@/components/Container";
import { joinWaitlistAction } from "@/app/waitlist-actions";

/**
 * Landing waitlist capture — the conversion fix from the Scanfit
 * teardown: visitors without an invite code previously had no
 * possible action on the page. Closed-beta framing is kept ("the
 * list is the queue for invites"), so the capture reinforces the
 * exclusivity positioning instead of diluting it.
 */
export default function WaitlistSection() {
  const t = useTranslations("Marketing.waitlist");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<"idle" | "done" | "error">("idle");

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await joinWaitlistAction(formData);
      setState(res.ok ? "done" : "error");
    });
  }

  return (
    <section id="waitlist" className="relative border-t hairline py-20 md:py-28 scroll-mt-[calc(var(--header-h)+1rem)]">
      <Container>
        <div className="grid gap-12 md:grid-cols-12 items-center">
          <div className="md:col-span-6" data-reveal>
            <div className="eyebrow mb-4">{t("eyebrow")}</div>
            <h2 className="font-display text-[clamp(2.4rem,6vw,5rem)] leading-[0.92] mb-5">
              {t("heading")}
            </h2>
            <p className="text-fg-dim text-base md:text-lg leading-relaxed max-w-md">
              {t("intro")}
            </p>
          </div>

          <div
            className="md:col-span-6 surface-2 rounded-lg p-6 md:p-8"
            data-reveal
            style={{ transitionDelay: "120ms" }}
          >
            {state === "done" ? (
              <div>
                <div className="eyebrow mb-3">{t("doneEyebrow")}</div>
                <p className="font-display text-2xl md:text-3xl leading-tight mb-3">
                  {t("doneHeading")}
                </p>
                <p className="text-fg-dim text-sm md:text-base leading-relaxed">
                  {t("doneBody")}
                </p>
              </div>
            ) : (
              <form action={onSubmit} className="space-y-4">
                <label
                  htmlFor="waitlist-email"
                  className="eyebrow block"
                >
                  {t("emailLabel")}
                </label>
                <input
                  id="waitlist-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  placeholder={t("emailPlaceholder")}
                  className="field"
                />
                {/* Honeypot — hidden from humans, filled by bots. */}
                <input
                  type="text"
                  name="company"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden
                  className="hidden"
                />
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  disabled={pending}
                  className="btn btn-primary w-full justify-center"
                >
                  {pending ? t("ctaPending") : t("cta")}
                  <span aria-hidden>→</span>
                </button>
                {state === "error" ? (
                  <p role="alert" className="text-sm text-fg-dim">
                    {t("error")}
                  </p>
                ) : null}
                <p className="text-[11px] text-fg-faint font-mono uppercase tracking-[0.14em] pt-2 border-t hairline">
                  {t("note")}
                </p>
              </form>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
