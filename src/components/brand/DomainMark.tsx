import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 24px stroke marks for the four health domains.
 *
 * Same organ language as MakeItFigure v3A.2 (docs/MAKEIT_FIGURE.md):
 *   heart = anatomical fist + two vessel stubs (not a valentine)
 *   food  = open J-stomach + esophagus + three coils (not a balloon)
 *   mind  = head / crown arc (no face)
 *   body  = kinetic chain / figure fragment
 *
 * Stroke language matches the mobile tab-icons (1.6, round caps,
 * currentColor). Designed to read at 16–24px and in kickers.
 */
export const DOMAINS = ["mind", "heart", "body", "food"] as const;
export type Domain = (typeof DOMAINS)[number];

const STROKE = {
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Anatomical heart volume — wide base, apex down-right. Scaled from MakeItFigure. */
export const MARK_HEART_VOLUME =
  "M7.2 10.7C6.2 12.3 5.9 15.1 6.9 17.7C8.0 19.8 10.6 21.1 13.7 20.8L16.8 19.0C18.1 17.2 17.9 13.6 15.8 10.7C14.0 8.4 11.1 7.3 8.8 8.4C7.7 8.9 7.2 9.7 7.2 10.7Z";

/** Ascending aorta — rises and arches right. */
export const MARK_HEART_AORTA = "M11.4 8.1L11.4 4.7C11.4 3.4 13.2 2.9 15.0 3.7";

/** Pulmonary stub — shorter, left of the aorta. */
export const MARK_HEART_PULM = "M9.5 8.4L8.5 5.5C7.9 4.5 6.4 4.2 5.4 5.0";

/** Septum / anterior groove — diagonal to the apex. */
export const MARK_HEART_SULCUS = "M10.3 10.4C11.9 13.6 14.0 16.9 16.8 19.3";

/** Esophagus — marks the tract, not a bowl. */
export const MARK_GUT_ESOPHAGUS = "M10.6 2.8L10.6 5.4";

/** Open J-stomach: fundus right, pylorus hooks left toward the midline. */
export const MARK_GUT_STOMACH =
  "M10.2 6.4C10.2 4.6 12.8 3.6 15.6 3.8C17.6 4.0 19.4 5.4 19.2 7.4C19.0 9.4 17.4 11.0 15.0 11.8C12.8 12.6 10.6 12.0 9.6 10.6C8.8 9.6 9.2 8.4 10.4 8.2";

/** Soft fundus volume — the bag of the J. */
export const MARK_GUT_FUNDUS =
  "M14.2 4.2C16.4 3.8 18.4 5.2 18.4 7.2C18.4 9.0 16.8 10.6 14.8 10.8C13.2 11.0 12.2 9.6 12.6 7.8C12.9 6.0 13.1 4.6 14.2 4.2Z";

/** Three horizontal bowel loops — not a vertical string. */
export const MARK_GUT_COILS = [
  "M9.2 12.2C7.4 13.0 7.0 15.0 8.6 16.0C10.2 17.0 13.2 17.2 15.2 16.0",
  "M15.6 16.4C17.6 17.2 18.0 19.4 16.2 20.4C14.4 21.4 11.0 21.6 9.2 20.2C7.4 18.8 8.4 16.8 10.8 16.4",
  "M9.0 20.2C7.4 20.8 7.4 22.0 9.2 22.4C11.0 22.8 13.8 22.4 14.8 21.2",
] as const;

function MindMark() {
  return (
    <>
      {/* Crown arc — the skull curve from MakeItFigure mind-anchor */}
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
    <g data-heart="organ">
      <path
        d={MARK_HEART_VOLUME}
        data-heart-layer="volume"
        fill="currentColor"
        fillOpacity={0.14}
        {...STROKE}
      />
      <path
        d={MARK_HEART_SULCUS}
        data-heart-layer="sulcus"
        fill="none"
        {...STROKE}
      />
      <path
        d={MARK_HEART_AORTA}
        data-heart-layer="aorta"
        fill="none"
        {...STROKE}
      />
      <path
        d={MARK_HEART_PULM}
        data-heart-layer="pulm"
        fill="none"
        {...STROKE}
      />
    </g>
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
    <g data-gut="tract">
      <path
        d={MARK_GUT_ESOPHAGUS}
        data-gut="esophagus"
        fill="none"
        {...STROKE}
      />
      <path
        d={MARK_GUT_FUNDUS}
        data-gut="fundus"
        fill="currentColor"
        fillOpacity={0.12}
        stroke="none"
      />
      <path
        d={MARK_GUT_STOMACH}
        data-gut="stomach"
        fill="none"
        {...STROKE}
      />
      {MARK_GUT_COILS.map((d, i) => (
        <path key={i} d={d} data-gut="coil" fill="none" {...STROKE} />
      ))}
    </g>
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
      className={cn("domain-mark size-6 overflow-visible", `domain-mark--${domain}`, className)}
      data-domain={domain}
      aria-hidden
    >
      <Glyph />
    </svg>
  );
}
