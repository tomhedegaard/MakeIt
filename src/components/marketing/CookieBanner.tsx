"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "mi_cookie_consent_v1";

type Choice = "accepted" | "essential" | null;

export default function CookieBanner() {
  const [choice, setChoice] = useState<Choice>("essential"); // assume dismissed until checked
  const [hasChecked, setHasChecked] = useState(false);

  // One-shot read of the persisted consent choice on mount; setState here
  // is intentional and won't cascade.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChoice((v === "accepted" || v === "essential" ? v : null) as Choice);
      setHasChecked(true);
    } catch {
      setHasChecked(true);
    }
  }, []);

  function persist(c: NonNullable<Choice>) {
    try {
      window.localStorage.setItem(STORAGE_KEY, c);
    } catch {
      // ignore
    }
    setChoice(c);
  }

  if (!hasChecked || choice !== null) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-title"
      className="fixed bottom-4 inset-x-4 md:inset-x-auto md:right-6 md:left-auto md:max-w-md z-50 surface-2 rounded-2xl p-5"
      style={{ borderColor: "var(--line-bright)" }}
    >
      <div className="eyebrow mb-2">Cookies</div>
      <h3 id="cookie-title" className="font-display text-lg leading-snug mb-2">
        Vi sætter en enkelt session-cookie.
      </h3>
      <p className="text-sm text-fg-dim leading-relaxed mb-4">
        Vi bruger en strengt nødvendig cookie for at holde dig logget ind. Ingen
        analytics-cookies, ingen tracking, ingen ad-pixels. Læs detaljerne i{" "}
        <Link href="/privacy" className="underline hover:text-fg">
          privacy policy
        </Link>
        .
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => persist("accepted")}
        >
          OK
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={() => persist("essential")}
        >
          Kun nødvendige
        </button>
      </div>
    </div>
  );
}
