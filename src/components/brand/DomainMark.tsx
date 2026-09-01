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
      {/* Front head + chin — shoulders keep it from reading as a bulb */}
      <path
        d="M7.4 8.1c0-2.7 2-4.8 4.6-4.8s4.6 2.1 4.6 4.8c0 1.85-.9 3.15-2 3.85"
        fill="none"
        {...STROKE}
      />
      <path d="M7.4 8.1c.15 2.05 1.15 3.55 2.55 4.35" fill="none" {...STROKE} />
      <path d="M9.2 12.9c.7 1.15 1.7 1.7 2.8 1.7s2.1-.55 2.8-1.7" fill="none" {...STROKE} />
      <path d="M10.15 14.6v1.7" fill="none" {...STROKE} />
      <path d="M13.85 14.6v1.7" fill="none" {...STROKE} />
      <path d="M7.1 17.6c1.2-1.15 2.6-1.5 4.9-1.5s3.7.35 4.9 1.5" fill="none" {...STROKE} />
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
      {/* Esophagus — the cue that this is a tract, not a bowl */}
      <path d="M10.4 3.3v3.1" fill="none" {...STROKE} />
      {/* Stomach (J-pouch) */}
      <path
        d="M9.1 6.8c0-1.05.85-1.5 1.9-1.5h1.7c2.05 0 3.5 1.65 3.5 3.7 0 2.7-1.65 4.15-3.7 4.95-1.65.65-2.7.2-3.3-.85"
        fill="none"
        {...STROKE}
      />
      <path d="M9.1 8c.2 1.85.85 3.3 2.25 4.15" fill="none" {...STROKE} />
      {/* Small-intestine coils */}
      <path
        d="M13.9 14c2.2.45 3.05 2.25 2.05 3.7-1.15 1.65-3.45 1.45-4.25-.05"
        fill="none"
        {...STROKE}
      />
      <path
        d="M11.7 17.65c-1.45.25-2.25 1.65-1.2 2.85 1.05 1.2 2.85.8 3.25-.45"
        fill="none"
        {...STROKE}
      />
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
