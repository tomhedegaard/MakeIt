import Link from "next/link";

/**
 * Dashboard tile for the Mind module (B-layer).
 *
 * Compact one-row card showing either:
 *  - "Tag dit mind-check (60 sek)" if not yet logged today, OR
 *  - "Dagens refleksion klar" if today's AI-coach output is ready, OR
 *  - "Streak: X dage" status fallback
 *
 * Always links to /mind (which routes to onboarding if not yet
 * acknowledged, else /mind/check).
 */
export default function MindTile({
  hasMindCheckToday,
  hasCoachOutputToday,
  currentStreak,
}: {
  hasMindCheckToday: boolean;
  hasCoachOutputToday: boolean;
  currentStreak: number;
}) {
  const { title, sub, cta } = (() => {
    if (!hasMindCheckToday) {
      return {
        title: "Mind-check venter",
        sub: "60 sek. Tre sliders. Det tager kortere tid end at vente på næste sæt.",
        cta: "Start nu",
      };
    }
    if (hasCoachOutputToday) {
      return {
        title: "Dagens refleksion klar",
        sub: "AI-coach har skrevet ud fra dit signal i dag.",
        cta: "Læs",
      };
    }
    return {
      title: `Stribe: ${currentStreak} dage`,
      sub: "Bliv på den. Næste milestone er +20 Reps ved 7 dage.",
      cta: "Til Mind",
    };
  })();

  return (
    <Link
      href="/mind"
      className="block surface-2 rounded-xl px-5 py-4 lift"
      style={{ borderColor: "var(--line-bright)" }}
    >
      <div className="flex items-center gap-3">
        <span className="pulse-dot" />
        <div className="flex-1 min-w-0">
          <div className="text-sm">{title}</div>
          <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint mt-0.5">
            {sub}
          </div>
        </div>
        <span className="text-fg-dim shrink-0 text-sm" aria-hidden>
          {cta} →
        </span>
      </div>
    </Link>
  );
}
