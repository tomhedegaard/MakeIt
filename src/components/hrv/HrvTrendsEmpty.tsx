import type { ReactNode } from "react";

/**
 * Honest empty state for `/hrv/trends` when the member has zero readings.
 *
 * No plot frame, no invented points — title + body + wearable CTA.
 * Parent owns copy and the connect control.
 */
export default function HrvTrendsEmpty({
  eyebrow,
  title,
  body,
  disclaimer,
  cta,
}: {
  eyebrow: string;
  title: string;
  body: string;
  disclaimer: string;
  cta: ReactNode;
}) {
  return (
    <section
      data-hrv-trends="empty"
      className="surface-2 rounded-2xl overflow-hidden"
    >
      <div className="px-6 py-7 md:px-8 md:py-10 border-b hairline">
        <div className="eyebrow eyebrow-domain mb-3">{eyebrow}</div>
        <h2 className="font-display text-3xl md:text-4xl leading-[1.02] mb-3">
          {title}
        </h2>
        <p className="text-fg-dim text-sm md:text-base leading-relaxed max-w-md">
          {body}
        </p>
      </div>
      <div className="p-5 md:p-8 space-y-4">
        {cta}
        <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint leading-relaxed">
          {disclaimer}
        </p>
      </div>
    </section>
  );
}
