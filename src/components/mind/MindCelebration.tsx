"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface CelebrationProps {
  /** Kind of milestone the celebration fired for. */
  kind: "first_check" | "streak_3" | "streak_7" | "streak_30" | "streak_90";
}

/** Reps awarded per milestone; the copy itself lives in Mind.celebration. */
const REPS: Record<CelebrationProps["kind"], number> = {
  first_check: 0,
  streak_3: 5,
  streak_7: 20,
  streak_30: 150, // 100 streak + 50 milestone
  streak_90: 500, // 300 streak + 200 milestone
};

/**
 * Per-kind localStorage key so each milestone shows ONCE.
 */
function storageKey(kind: CelebrationProps["kind"]): string {
  return `mi_mind_celebrate_${kind}_v1`;
}

/**
 * Inline banner that fires once per milestone (first mind-check or
 * streak milestone hit). Tracks shown state in localStorage so it
 * doesn't re-show on subsequent dashboard renders.
 *
 * The PARENT decides which kind to render (server-side: read current
 * streak + previous, derive milestone if just crossed). This component
 * only handles the show-once + dismiss UX.
 */
export default function MindCelebration({ kind }: CelebrationProps) {
  const t = useTranslations("Mind.celebration");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = window.localStorage.getItem(storageKey(kind));
      if (!seen) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVisible(true);
      }
    } catch {
      // ignore
    }
  }, [kind]);

  function dismiss() {
    try {
      window.localStorage.setItem(storageKey(kind), "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;
  const reps = REPS[kind];

  return (
    <div
      role="status"
      className="surface-2 p-6 md:p-8"
    >
      <div className="relative space-y-3">
        <div className="flex items-center justify-between">
          <div className="eyebrow">{t(`kind.${kind}.eyebrow`)}</div>
          {reps > 0 ? (
            <span className="text-micro numeric px-2.5 py-1 border hairline">
              {t("reps", { reps })}
            </span>
          ) : null}
        </div>
        <h2 className="font-display text-section">
          {t(`kind.${kind}.title`)}
        </h2>
        <p className="text-fg-dim leading-relaxed">{t(`kind.${kind}.body`)}</p>
        <button
          type="button"
          onClick={dismiss}
          className="btn btn-primary mt-2"
        >
          {t("dismiss")}
        </button>
      </div>
    </div>
  );
}
