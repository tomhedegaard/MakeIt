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
 * a 1px low-opacity --food halo around the whole silhouette (dosage,
 * never a filled green cloud). See docs/MAKEIT_FIGURE.md.
 *
 * Body lights AnatomyFigure muscle parts (the kinetic chain), not
 * overlay stroke segments. Head / hair stay mind; abs / obliques stay
 * clear so the food gut can read.
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
}: {
  highlightedDomains?: readonly Domain[];
  className?: string;
  ariaLabel?: string;
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
        <path
          d={outline}
          className="makeit-figure-halo"
          data-domain="food"
          fill="none"
          stroke="var(--food)"
          strokeWidth="1"
          opacity="0.28"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}

      <path
        d={outline}
        className="makeit-figure-outline"
        fill="var(--steel)"
        stroke="var(--fg-faint)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />

      {/* Body first so heart / gut sit on top of chest and torso fills. */}
      <g
        className={cn("makeit-figure-anchor", bodyOn && "is-lit")}
        data-domain="body"
        data-lit={bodyOn || undefined}
      >
        {bodyOn
          ? BODY_PARTS.map((part) => (
              <g key={part.slug} data-muscle={part.slug}>
                {partPaths(part).map((d, i) => (
                  <path
                    key={i}
                    d={d}
                    fill="var(--body)"
                    fillOpacity={0.18}
                  />
                ))}
              </g>
            ))
          : null}
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
            fill={mindOn ? "var(--mind)" : "none"}
            fillOpacity={mindOn ? 0.18 : 0}
            stroke={mindOn ? "var(--mind)" : "var(--fg-faint)"}
            strokeWidth="1.4"
            opacity={mindOn ? 0.85 : 0.42}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>

      {/* Heart = heart in the chest (person's left / viewer's right). */}
      <g
        className={cn("makeit-figure-anchor", heartOn && "is-lit")}
        data-domain="heart"
        data-lit={heartOn || undefined}
      >
        <path
          d="M388 412c-3.4-2.8-17.2-14.2-17.2-24.6 0-7.6 5.2-12.8 12-12.8 3.6 0 6 1.7 5.2 4 0-2.3 1.6-4 5.2-4 6.8 0 12 5.2 12 12.8 0 10.4-13.8 21.8-17.2 24.6z"
          fill={heartOn ? "var(--heart)" : "none"}
          fillOpacity={heartOn ? 0.2 : 0}
          stroke={heartOn ? "var(--heart)" : "var(--fg-faint)"}
          strokeWidth="1.4"
          opacity={heartOn ? 0.9 : 0.42}
          vectorEffect="non-scaling-stroke"
        />
      </g>

      {/* Food = stomach / gut as the anchor. Halo is drawn above. */}
      <g
        className={cn("makeit-figure-anchor", foodOn && "is-lit")}
        data-domain="food"
        data-lit={foodOn || undefined}
      >
        <path
          d="M338 488c0-22 20-38 46-38h10c32 0 54 26 50 56-4 28-22 46-50 58-22 10-36 4-42-12"
          fill={foodOn ? "var(--food)" : "none"}
          fillOpacity={foodOn ? 0.16 : 0}
          stroke={foodOn ? "var(--food)" : "var(--fg-faint)"}
          strokeWidth="1.4"
          opacity={foodOn ? 0.85 : 0.42}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M338 502c4 26 14 44 34 56"
          fill="none"
          stroke={foodOn ? "var(--food)" : "var(--fg-faint)"}
          strokeWidth="1.4"
          opacity={foodOn ? 0.85 : 0.42}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M394 564c34 14 46 40 28 64-18 24-54 26-70 4"
          fill="none"
          stroke={foodOn ? "var(--food)" : "var(--fg-faint)"}
          strokeWidth="1.4"
          opacity={foodOn ? 0.85 : 0.42}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M352 632c-8 20 8 42 34 48"
          fill="none"
          stroke={foodOn ? "var(--food)" : "var(--fg-faint)"}
          strokeWidth="1.4"
          opacity={foodOn ? 0.85 : 0.42}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </svg>
  );
}
