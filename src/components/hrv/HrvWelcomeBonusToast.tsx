"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * V2.5 first-wearable-connection celebration toast (spec §5.3).
 *
 * Triggered by the ?welcome_bonus=1 query param that the OAuth
 * callback appends on a fresh bonus award. Strips the param from
 * the URL on mount via history.replaceState so a refresh does
 * NOT re-show the toast. No DB state.
 *
 * Brand vocabulary: no emoji — matches HrvMilestoneToast and the
 * nutrition StreakCelebration register.
 */
export function HrvWelcomeBonusToast() {
  const searchParams = useSearchParams();
  const hasParam = searchParams?.get("welcome_bonus") === "1";
  const [visible, setVisible] = useState(hasParam);

  useEffect(() => {
    if (hasParam && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("welcome_bonus");
      window.history.replaceState({}, "", url.toString());
    }
  }, [hasParam]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="surface-2 rounded-2xl px-4 py-3 text-sm flex items-center gap-3"
      style={{ borderColor: "var(--line-bright)" }}
      data-testid="hrv-welcome-bonus-toast"
    >
      <span className="flex-1">Wearable forbundet. +100 Reps tilføjet.</span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="text-xs text-fg-dim"
        aria-label="Luk besked"
      >
        Luk
      </button>
    </div>
  );
}
