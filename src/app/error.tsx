"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * Root error boundary. Renders for any uncaught error in the route
 * tree (server actions, data fetching, child components). Keep it
 * brand-aligned and offer the two recovery paths a user actually
 * needs: try again, or go home.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Misc.error");

  useEffect(() => {
    // Log to console in dev; in prod this is where Sentry would capture.
    console.error("[error.tsx]", error);
  }, [error]);

  return (
    <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-24">
      <div className="max-w-md text-center">
        <div className="eyebrow mb-3">{t("eyebrow")}</div>
        <h1 className="font-display text-4xl md:text-5xl mb-4 leading-[0.95]">
          {t("title")}
        </h1>
        <p className="text-fg-dim text-base leading-relaxed mb-8">
          {t("body")}
        </p>
        {error.digest && (
          <p className="text-xs font-mono text-fg-faint mb-8">
            {t("ref", { digest: error.digest })}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button onClick={reset} type="button" className="btn btn-primary">
            {t("retry")}
          </button>
          <Link href="/" className="btn">
            {t("home")}
          </Link>
        </div>
      </div>
    </main>
  );
}
