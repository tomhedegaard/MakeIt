import Link from "next/link";
import type { MentalSession } from "@/lib/mind/types";

const CATEGORY_LABEL: Record<MentalSession["category"], string> = {
  breathing: "Vejrtrækning",
  focus: "Fokus",
  recovery: "Recovery",
  debrief: "Debrief",
};

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
  const minutes = Math.round(session.duration_seconds / 60);
  return (
    <Link
      href={`/mind/sessions/${session.slug}`}
      className="block rounded-2xl border hairline bg-bg-2/30 hover:bg-bg-2/60 transition-colors p-5 space-y-3 group"
    >
      <div className="flex items-baseline justify-between">
        <div className="eyebrow">{CATEGORY_LABEL[session.category]}</div>
        <div className="text-fg-dim text-xs tabular-nums">{minutes} min</div>
      </div>
      <h3 className="font-display text-xl group-hover:translate-x-0.5 transition-transform">
        {session.title}
      </h3>
      {session.subtitle ? (
        <p className="text-fg-dim text-sm">{session.subtitle}</p>
      ) : null}
      {completed ? (
        <div className="text-xs text-emerald-300/80 pt-1">✓ Gennemført</div>
      ) : null}
    </Link>
  );
}
