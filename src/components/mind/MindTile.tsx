import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * Dashboard tile for the Mind module (B-layer).
 *
 * Compact one-row card showing either:
 *  - waiting if not yet logged today, OR
 *  - reflection ready if today's Motor output is ready, OR
 *  - streak fallback
 *
 * Always links to /mind (which routes to onboarding if not yet
 * acknowledged, else /mind/check).
 */
export default async function MindTile({
  hasMindCheckToday,
  hasCoachOutputToday,
  currentStreak,
}: {
  hasMindCheckToday: boolean;
  hasCoachOutputToday: boolean;
  currentStreak: number;
}) {
  const t = await getTranslations("Mind.tile");
  const { title, sub, cta } = (() => {
    if (!hasMindCheckToday) {
      return {
        title: t("waitingTitle"),
        sub: t("waitingSub"),
        cta: t("waitingCta"),
      };
    }
    if (hasCoachOutputToday) {
      return {
        title: t("readyTitle"),
        sub: t("readySub"),
        cta: t("readyCta"),
      };
    }
    return {
      title: t("streakTitle", { days: currentStreak }),
      sub: t("streakSub"),
      cta: t("streakCta"),
    };
  })();

  return (
    <Link
      href="/mind"
      data-domain="mind"
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
