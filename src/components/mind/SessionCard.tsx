import Link from "next/link";
import { useTranslations } from "next-intl";
import type { MentalSession } from "@/lib/mind/types";

/**
 * Card for one hero session in the catalog. Links to the runner page.
 */
export default function SessionCard({
  session,
  completed,
}: {
  session: MentalSession;
  completed: boolean;
}) {
  const t = useTranslations("Mind.sessionCard");
  const minutes = Math.round(session.duration_seconds / 60);
  return (
    <Link
      href={`/mind/sessions/${session.slug}`}
      className="block rounded-2xl border hairline bg-bg-2/30 hover:bg-bg-2/60 transition-colors p-5 space-y-3 group"
    >
      <div className="flex items-baseline justify-between">
        <div className="eyebrow eyebrow-domain">
          {t(`category.${session.category}`)}
        </div>
        <div className="text-fg-dim text-xs tabular-nums">
          {t("minutes", { minutes })}
        </div>
      </div>
      <h3 className="font-display text-xl group-hover:translate-x-0.5 transition-transform">
        {session.title}
      </h3>
      {session.subtitle ? (
        <p className="text-fg-dim text-sm">{session.subtitle}</p>
      ) : null}
      {completed ? (
        <div className="text-xs text-domain/80 pt-1">{t("completed")}</div>
      ) : null}
    </Link>
  );
}
