"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import Container from "@/components/Container";
import { COMPANY, SUPPORT_MAILTO } from "@/lib/company";

/**
 * Logged-in app error boundary. Sits inside (app) so it preserves the
 * AppShell chrome (sidebar / mobile tab bar) — only the inner route
 * content swaps to this fallback. Lets the member jump back to the
 * dashboard rather than bouncing them all the way out.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Nav.error");

  useEffect(() => {
    console.error("[(app)/error.tsx]", error);
  }, [error]);

  return (
    <Container className="py-16 md:py-24">
      <div className="max-w-md">
        <div className="eyebrow mb-3">{t("eyebrow")}</div>
        <h1 className="font-display text-3xl md:text-4xl mb-4 leading-[0.95]">
          {t("title")}
        </h1>
        <p className="text-fg-dim text-base leading-relaxed mb-8">
          {t("descriptionBefore")}{" "}
          <a className="underline hover:text-fg" href={SUPPORT_MAILTO}>
            {COMPANY.emails.support}
          </a>
          .
        </p>
        {error.digest && (
          <p className="text-xs font-mono text-fg-faint mb-8">
            {t("ref", { digest: error.digest })}
          </p>
        )}
        <div className="flex items-center gap-3">
          <button onClick={reset} type="button" className="btn btn-primary">
            {t("retry")}
          </button>
          <Link href="/dashboard" className="btn">
            {t("toDashboard")}
          </Link>
        </div>
      </div>
    </Container>
  );
}
