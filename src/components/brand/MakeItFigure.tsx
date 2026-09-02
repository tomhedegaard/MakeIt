import { cn } from "@/lib/utils";
import {
  OUTLINES,
  PARTS,
  VIEWBOX,
  type RnbhBodyPart,
  type RnbhSlug,
} from "@/lib/data/anatomy/paths";
import type { Domain } from "./DomainMark";

/**
 * Brand body-map. Charcoal outline traced from AnatomyFigure
 * (OUTLINES.male.front) so we do not introduce a second body language.
 *
 * highlightedDomains lights only the matching anchor. Food also draws
 * a 1px --food halo plus a soft outer glow around the whole silhouette
 * (dosage: aura, never a filled green cloud). See docs/MAKEIT_FIGURE.md §2.
 *
 * Body lights AnatomyFigure muscle parts (the kinetic chain), not
 * overlay stroke segments. Head / hair stay mind; abs / obliques stay
 * clear so the food gut can read. Unlit anchors stay faintly visible.
 *
 * No 3D. No photo. No mascot face. Coach stays type.
 */

const HEAD_PATHS = PARTS.male.front.find((p) => p.slug === "head")?.path.common ?? [];

/** Kinetic-chain musculature on the front silhouette. */
const BODY_SLUGS = new Set<RnbhSlug>([
  "neck",
  "trapezius",
  "deltoids",
  "chest",
  "biceps",
  "triceps",
  "forearm",
  "quadriceps",
  "adductors",
  "tibialis",
  "calves",
]);

const BODY_PARTS = PARTS.male.front.filter((p) => BODY_SLUGS.has(p.slug));

/**
 * v1 heart glyph, scaled 2× around its visual center and nudged
 * toward the person's left (viewer's right) so it reads as a chest
 * organ at landing sizes (h-80 / 36rem). Locked in MAKEIT_FIGURE.md §2.
 */
const HEART_PATH =
  "M388 412c-3.4-2.8-17.2-14.2-17.2-24.6 0-7.6 5.2-12.8 12-12.8 3.6 0 6 1.7 5.2 4 0-2.3 1.6-4 5.2-4 6.8 0 12 5.2 12 12.8 0 10.4-13.8 21.8-17.2 24.6z";
const HEART_ORIGIN = { x: 388, y: 394 };
const HEART_ANCHOR = { x: 400, y: 398 };
export const HEART_SCALE = 2;

/** J-stomach + intestinal coils — slightly larger than v1 so --food reads at distance. */
const GUT_STOMACH =
  "M322 500c0-28 26-50 58-50h14c40 0 68 32 62 70-6 36-30 58-64 72-28 12-50 2-56-18";
const GUT_COILS = [
  "M328 522c8 36 24 60 52 76",
  "M388 596c48 18 64 54 36 84-28 30-80 32-98 2",
  "M336 668c-12 26 14 52 46 58",
] as const;

const FOOD_GLOW_FILTER_ID = "makeit-figure-food-glow";

function partPaths(part: RnbhBodyPart): string[] {
  return [
    ...(part.path.common ?? []),
    ...(part.path.left ?? []),
    ...(part.path.right ?? []),
  ];
}

function isOn(list: readonly Domain[], domain: Domain) {
  return list.includes(domain);
}

export default function MakeItFigure({
  highlightedDomains = [],
  className,
  ariaLabel,
  onDomainHover,
}: {
  highlightedDomains?: readonly Domain[];
  className?: string;
  ariaLabel?: string;
  /** When set, invisible SVG hot-zones teach each domain on pointer. */
  onDomainHover?: (domain: Domain | null) => void;
}) {
  const mindOn = isOn(highlightedDomains, "mind");
  const heartOn = isOn(highlightedDomains, "heart");
  const bodyOn = isOn(highlightedDomains, "body");
  const foodOn = isOn(highlightedDomains, "food");
  const outline = OUTLINES.male.front;

  return (
    <svg
      viewBox={VIEWBOX.male.front}
      className={cn("makeit-figure", className)}
      role="img"
      aria-label={ariaLabel}
      data-highlighted={highlightedDomains.join(" ") || undefined}
      overflow="visible"
    >
      {foodOn ? (
        <g className="makeit-figure-food-aura" data-domain="food" aria-hidden>
          <defs>
            <filter
              id={FOOD_GLOW_FILTER_ID}
              x="-16%"
              y="-8%"
              width="132%"
              height="116%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="12" />
            </filter>
          </defs>
          {/* Soft outer glow — 8px non-scaling stroke so the aura reads
              through landing grain, plus a light blur. Never a filled cloud. */}
          <path
            d={outline}
            className="makeit-figure-halo-glow"
            fill="none"
            stroke="var(--food)"
            strokeWidth="8"
            opacity="0.12"
            vectorEffect="non-scaling-stroke"
            filter={`url(#${FOOD_GLOW_FILTER_ID})`}
          />
          {/* Crisp 1px halo — non-scaling so 1px stays 1px at every size. */}
          <path
            d={outline}
            className="makeit-figure-halo"
            fill="none"
            stroke="var(--food)"
            strokeWidth="1"
            opacity="0.35"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ) : null}

      <path
        d={outline}
        className="makeit-figure-outline"
        fill="var(--steel)"
        stroke="var(--fg-faint)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />

      {/* Body first so heart / gut sit on top of chest and torso fills.
          Always drawn: unlit = charcoal presence; lit = --body dosage. */}
      <g
        className={cn("makeit-figure-anchor", bodyOn && "is-lit")}
        data-domain="body"
        data-lit={bodyOn || undefined}
      >
        {BODY_PARTS.map((part) => (
          <g key={part.slug} data-muscle={part.slug}>
            {partPaths(part).map((d, i) => (
              <path
                key={i}
                d={d}
                fill={bodyOn ? "var(--body)" : "var(--fg-faint)"}
                fillOpacity={bodyOn ? 0.22 : 0.05}
                stroke={bodyOn ? "var(--body)" : "var(--fg-faint)"}
                strokeWidth="1"
                strokeOpacity={bodyOn ? 0.48 : 0.22}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        ))}
      </g>

      {/* Mind = head. Traced from AnatomyFigure's head part. */}
      <g
        className={cn("makeit-figure-anchor", mindOn && "is-lit")}
        data-domain="mind"
        data-lit={mindOn || undefined}
      >
        {HEAD_PATHS.map((d, i) => (
          <path
            key={i}
            d={d}
            fill={mindOn ? "var(--mind)" : "var(--fg-faint)"}
            fillOpacity={mindOn ? 0.24 : 0.04}
            stroke={mindOn ? "var(--mind)" : "var(--fg-faint)"}
            strokeWidth={mindOn ? 1.7 : 1.35}
            opacity={mindOn ? 0.94 : 0.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>

      {/* Heart = chest organ, person's left / viewer's right. */}
      <g
        className={cn("makeit-figure-anchor", heartOn && "is-lit")}
        data-domain="heart"
        data-lit={heartOn || undefined}
        data-heart-scale={HEART_SCALE}
        transform={`translate(${HEART_ANCHOR.x} ${HEART_ANCHOR.y}) scale(${HEART_SCALE}) translate(${-HEART_ORIGIN.x} ${-HEART_ORIGIN.y})`}
      >
        {/* Dark under-stroke so the organ punches out of orange pec fills. */}
        <path
          d={HEART_PATH}
          fill="none"
          stroke="var(--bg)"
          strokeWidth="4"
          opacity={heartOn ? 0.9 : 0.45}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={HEART_PATH}
          fill={heartOn ? "var(--heart)" : "none"}
          fillOpacity={heartOn ? 0.28 : 0}
          stroke={heartOn ? "var(--heart)" : "var(--fg-faint)"}
          strokeWidth="1.8"
          opacity={heartOn ? 0.96 : 0.52}
          vectorEffect="non-scaling-stroke"
        />
      </g>

      {/* Food = J-stomach / coils as the anchor. Halo + glow drawn above. */}
      <g
        className={cn("makeit-figure-anchor", foodOn && "is-lit")}
        data-domain="food"
        data-lit={foodOn || undefined}
      >
        <path
          d={GUT_STOMACH}
          data-gut="stomach"
          fill={foodOn ? "var(--food)" : "none"}
          fillOpacity={foodOn ? 0.16 : 0}
          stroke={foodOn ? "var(--food)" : "var(--fg-faint)"}
          strokeWidth="1.5"
          opacity={foodOn ? 0.9 : 0.5}
          vectorEffect="non-scaling-stroke"
        />
        {GUT_COILS.map((d, i) => (
          <path
            key={i}
            d={d}
            data-gut="coil"
            fill="none"
            stroke={foodOn ? "var(--food)" : "var(--fg-faint)"}
            strokeWidth="1.5"
            opacity={foodOn ? 0.9 : 0.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>

      {/* Same silhouette — transparent hit areas only. Body is the
          full outline; organ zones sit on top so head / heart / gut
          win. No second body language. */}
      {onDomainHover ? (
        <g className="makeit-figure-hotzones" aria-hidden>
          <path
            d={outline}
            data-hotzone="body"
            fill="transparent"
            className="cursor-pointer"
            onPointerEnter={() => onDomainHover("body")}
          />
          <ellipse
            data-hotzone="food"
            cx="382"
            cy="558"
            rx="108"
            ry="142"
            fill="transparent"
            className="cursor-pointer"
            onPointerEnter={() => onDomainHover("food")}
          />
          <ellipse
            data-hotzone="heart"
            cx="400"
            cy="398"
            rx="80"
            ry="88"
            fill="transparent"
            className="cursor-pointer"
            onPointerEnter={() => onDomainHover("heart")}
          />
          {HEAD_PATHS.map((d, i) => (
            <path
              key={i}
              d={d}
              data-hotzone="mind"
              fill="transparent"
              className="cursor-pointer"
              onPointerEnter={() => onDomainHover("mind")}
            />
          ))}
        </g>
      ) : null}
    </svg>
  );
}
