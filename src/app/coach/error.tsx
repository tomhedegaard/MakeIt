"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import Container from "@/components/Container";

/**
 * Coach-side error boundary. Coach routes are sensitive (member data,
 * form-checks, redemptions) so we link back to the coach overview
 * rather than the member dashboard.
 */
export default function CoachError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Coach.error");

  useEffect(() => {
    console.error("[coach/error.tsx]", error);
  }, [error]);

  return (
    <Container className="py-16 md:py-24">
      <div className="max-w-md">
        <div className="eyebrow mb-3">{t("eyebrow")}</div>
        <h1 className="font-display text-3xl md:text-4xl mb-4 leading-[0.95]">
          {t("title")}
        </h1>
        <p className="text-fg-dim text-base leading-relaxed mb-8">
          {t("description")}
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
          <Link href="/coach" className="btn">
            {t("overview")}
          </Link>
        </div>
      </div>
    </Container>
  );
}
