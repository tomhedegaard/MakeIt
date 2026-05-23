import Link from "next/link";
import { nudgeCopy, NUDGE_HREF } from "@/lib/hrv/nudge";

type Props = {
  nudge: { bucket: "low" | "very_low" } | null;
};

/**
 * V2.4 session readiness banner. Renders above the first exercise
 * on /session/[id] when the member's latest HRV reading is low or
 * very_low and all other trigger conditions hold (see spec §3 and
 * the `evaluateNudge` helper). Renders nothing for null so callers
 * can include it unconditionally.
 *
 * All Danish strings + the destination route live in `@/lib/hrv/nudge`
 * and are unit-tested there — the component is presentation only.
 */
export default function HrvReadinessNudge({ nudge }: Props) {
  if (!nudge) return null;

  const { eyebrow, body } = nudgeCopy(nudge.bucket);

  return (
    <section
      aria-labelledby="hrv-nudge-heading"
      className="surface-2 rounded-2xl p-5 lg:p-6 space-y-3"
    >
      <h2 id="hrv-nudge-heading" className="eyebrow">
        {eyebrow}
      </h2>
      <p className="text-sm leading-relaxed text-fg-dim">{body}</p>
      <Link
        href={NUDGE_HREF}
        className="inline-block text-[11px] font-mono uppercase tracking-[0.14em] text-fg-dim lift touch-app"
      >
        Se HRV →
      </Link>
    </section>
  );
}
