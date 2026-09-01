import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 24px stroke marks for the four health domains.
 *
 * Same stroke language as the mobile tab-icons (1.6, round caps,
 * currentColor). These are body-map fragments — not Lucide barbell /
 * bowl / bulb. Mapping is locked in docs/MAKEIT_FIGURE.md:
 *   body  = kinetic chain / figure fragment
 *   food  = gut / digestive glyph
 *   mind  = head (no face)
 *   heart = heart
 */
export const DOMAINS = ["mind", "heart", "body", "food"] as const;
export type Domain = (typeof DOMAINS)[number];

const STROKE = {
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function MindMark() {
  return (
    <>
      {/* Head — no face, no bulb */}
      <path
        d="M12 3.2c-3.15 0-5.5 2.35-5.5 5.25 0 2.15 1.15 3.7 2.25 4.5v2.15c0 .7.55 1.25 1.25 1.25h4c.7 0 1.25-.55 1.25-1.25V12.95c1.1-.8 2.25-2.35 2.25-4.5C17.5 5.55 15.15 3.2 12 3.2z"
        fill="none"
        {...STROKE}
      />
      <path d="M9.7 16.7v1.9c0 .7.5 1.25 1.2 1.25h2.2c.7 0 1.2-.55 1.2-1.25v-1.9" fill="none" {...STROKE} />
    </>
  );
}

function HeartMark() {
  return (
    <path
      d="M12 19.2S5.6 14.3 5.6 10.1C5.6 7.55 7.5 5.8 9.8 5.8c1.3 0 2.2.65 2.2 1.55 0-.9.9-1.55 2.2-1.55 2.3 0 4.2 1.75 4.2 4.3C18.4 14.3 12 19.2 12 19.2z"
      fill="none"
      {...STROKE}
    />
  );
}

function BodyMark() {
  return (
    <>
      {/* Head fragment */}
      <path
        d="M12 3.15c1.15 0 2.05.9 2.05 2.05S13.15 7.25 12 7.25 9.95 6.35 9.95 5.2 10.85 3.15 12 3.15z"
        fill="none"
        {...STROKE}
      />
      {/* Spine + shoulder girdle + pelvis — the kinetic chain */}
      <path d="M12 7.4v6.1" fill="none" {...STROKE} />
      <path d="M6.6 9.15h10.8" fill="none" {...STROKE} />
      <path d="M6.6 9.15L4.7 14.4" fill="none" {...STROKE} />
      <path d="M17.4 9.15L19.3 14.4" fill="none" {...STROKE} />
      <path d="M9.15 13.5h5.7" fill="none" {...STROKE} />
      <path d="M9.7 13.5L8.05 20.6" fill="none" {...STROKE} />
      <path d="M14.3 13.5L15.95 20.6" fill="none" {...STROKE} />
    </>
  );
}

function FoodMark() {
  return (
    <>
      {/* Stomach pouch (J-shape) */}
      <path
        d="M8.4 6.4c0-1.25 1-2.2 2.4-2.2h2.1c1.85 0 3.25 1.5 3.25 3.4 0 2.45-1.4 3.7-3.25 4.5-1.4.6-2.25.4-2.85-.35"
        fill="none"
        {...STROKE}
      />
      <path d="M8.4 7.35c.1 1.65.6 2.9 1.85 3.75" fill="none" {...STROKE} />
      {/* Duodenum + small-intestine coil */}
      <path
        d="M14.7 12.15c2.05.85 2.85 2.65 1.85 4.3-1 1.65-3.25 1.9-4.5.6"
        fill="none"
        {...STROKE}
      />
      <path d="M12 16.95c1.45.85 1.65 2.5.2 3.5" fill="none" {...STROKE} />
    </>
  );
}

const MARK: Record<Domain, () => ReactNode> = {
  mind: MindMark,
  heart: HeartMark,
  body: BodyMark,
  food: FoodMark,
};

export default function DomainMark({
  domain,
  className,
}: {
  domain: Domain;
  className?: string;
}) {
  const Glyph = MARK[domain];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("domain-mark size-6", `domain-mark--${domain}`, className)}
      data-domain={domain}
      aria-hidden
    >
      <Glyph />
    </svg>
  );
}
