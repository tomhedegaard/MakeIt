import { useId } from "react";
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
 * v3A craft-pass (docs/MAKEIT_FIGURE.md §2): lift organ craft on the
 * existing silhouette. Do not replace OUTLINES.male.front — that is v3B.
 *
 * highlightedDomains lights only the matching anchor. Food draws the
 * 1px --food halo + soft glow only when food is the focused highlight
 * (not when all four are lit in teaching). Teaching is a balanced read:
 * organs as soft anchors, body the quietest ghost, no domain owns the
 * silhouette via glow.
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

export const ALL_DOMAINS: readonly Domain[] = ["mind", "heart", "body", "food"];

/** Locked abdomen band in viewBox units. Groin / crotch sits ~748. */
export const GUT_Y_MAX = 650;

const FOOD_GLOW_FILTER_BASE = "makeit-figure-food-glow";
const HEART_VOLUME_GRAD_BASE = "makeit-figure-heart-volume";

/**
 * Anatomical heart / region — person's left, viewer's right.
 * Tilted organ: wider base, apex down-right (person's left). Not a
 * valentine (no cleft, no symmetric lobes). Absolute M/C for tests.
 */
export const HEART_VOLUME =
  "M380 360C368 364 362 378 366 396C370 416 380 432 396 442C410 450 426 450 436 438C446 426 448 408 442 390C436 372 420 358 402 354C394 352 386 354 380 360Z";

/** Inner chamber — left-ventricle volume, slightly inset toward the apex. */
export const HEART_CHAMBER =
  "M398 380C390 384 386 396 390 410C394 422 406 432 418 428C428 424 432 410 426 396C422 384 410 376 398 380Z";

/** Anterior interventricular groove — diagonal toward the apex, not a cleft. */
export const HEART_SULCUS = "M394 370C404 392 416 414 430 430";

/** Short ascending-vessel stem at the base — a tube, not a loop. */
export const HEART_VESSEL = "M396 356C396 344 400 336 406 336";

/**
 * J-stomach in the upper abdomen, fundus on the person's left
 * (viewer's right). Closed path for a soft --food fill.
 */
export const GUT_STOMACH =
  "M370 506C370 476 396 456 424 458C452 460 470 482 464 510C458 538 436 556 408 566C386 574 366 564 364 544C362 528 368 514 370 506Z";

/** Intestinal coils — stay inside the abdomen (Y ≤ GUT_Y_MAX). */
export const GUT_COILS = [
  "M358 552C370 576 394 592 420 586",
  "M418 590C444 602 440 628 414 634C390 640 366 624 374 606",
  "M378 622C366 636 386 648 408 644",
] as const;

export const GUT_PATHS = [GUT_STOMACH, ...GUT_COILS] as const;

export type FigureMode = "idle" | "teaching" | "focus";

export function figureMode(list: readonly Domain[]): FigureMode {
  if (list.length === 0) return "idle";
  if (ALL_DOMAINS.every((d) => list.includes(d))) return "teaching";
  return "focus";
}

/** Full food aura only when food is on and the figure is not teaching. */
export function foodAuraFull(list: readonly Domain[]): boolean {
  return list.includes("food") && figureMode(list) !== "teaching";
}

/**
 * Extract Y values from absolute M/C/L/S path data (x,y pairs).
 * Used by tests to lock the gut inside the abdomen.
 */
export function pathAbsoluteYs(d: string): number[] {
  const nums = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map(Number);
  const ys: number[] = [];
  for (let i = 1; i < nums.length; i += 2) ys.push(nums[i]);
  return ys;
}

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

function mindLook(on: boolean, mode: FigureMode) {
  if (!on) {
    return {
      fill: "var(--fg-faint)",
      fillOpacity: 0.04,
      stroke: "var(--fg-faint)",
      strokeWidth: 1.35,
      opacity: 0.5,
    };
  }
  if (mode === "teaching") {
    return {
      fill: "var(--mind)",
      fillOpacity: 0.1,
      stroke: "var(--mind)",
      strokeWidth: 1.2,
      opacity: 0.55,
    };
  }
  return {
    fill: "var(--mind)",
    fillOpacity: 0.18,
    stroke: "var(--mind)",
    strokeWidth: 1.45,
    opacity: 0.82,
  };
}

function bodyLook(on: boolean, mode: FigureMode) {
  if (!on) {
    return {
      fill: "var(--fg-faint)",
      fillOpacity: 0.04,
      stroke: "var(--fg-faint)",
      strokeWidth: 0.75,
      strokeOpacity: 0.14,
    };
  }
  if (mode === "teaching") {
    return {
      fill: "var(--body)",
      fillOpacity: 0.055,
      stroke: "var(--body)",
      strokeWidth: 0.6,
      strokeOpacity: 0.12,
    };
  }
  return {
    fill: "var(--body)",
    fillOpacity: 0.1,
    stroke: "var(--body)",
    strokeWidth: 0.7,
    strokeOpacity: 0.2,
  };
}

function heartLook(on: boolean, mode: FigureMode) {
  if (!on) {
    return {
      volumeOpacity: 0.08,
      chamberOpacity: 0,
      stroke: "var(--fg-faint)",
      strokeOpacity: 0.5,
      vesselOpacity: 0.4,
      underOpacity: 0.35,
    };
  }
  if (mode === "teaching") {
    return {
      volumeOpacity: 0.2,
      chamberOpacity: 0.1,
      stroke: "var(--heart)",
      strokeOpacity: 0.62,
      vesselOpacity: 0.45,
      underOpacity: 0.55,
    };
  }
  return {
    volumeOpacity: 0.34,
    chamberOpacity: 0.18,
    stroke: "var(--heart)",
    strokeOpacity: 0.92,
    vesselOpacity: 0.7,
    underOpacity: 0.85,
  };
}

function foodLook(on: boolean, mode: FigureMode) {
  if (!on) {
    return {
      fill: "none" as const,
      fillOpacity: 0,
      stroke: "var(--fg-faint)",
      opacity: 0.5,
    };
  }
  if (mode === "teaching") {
    return {
      fill: "var(--food)" as const,
      fillOpacity: 0.08,
      stroke: "var(--food)",
      opacity: 0.55,
    };
  }
  return {
    fill: "var(--food)" as const,
    fillOpacity: 0.14,
    stroke: "var(--food)",
    opacity: 0.88,
  };
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
  const uid = useId().replace(/:/g, "");
  const foodGlowFilterId = `${FOOD_GLOW_FILTER_BASE}-${uid}`;
  const heartVolumeGradId = `${HEART_VOLUME_GRAD_BASE}-${uid}`;
  const mindOn = isOn(highlightedDomains, "mind");
  const heartOn = isOn(highlightedDomains, "heart");
  const bodyOn = isOn(highlightedDomains, "body");
  const foodOn = isOn(highlightedDomains, "food");
  const mode = figureMode(highlightedDomains);
  const showFoodAura = foodAuraFull(highlightedDomains);
  const outline = OUTLINES.male.front;
  const mind = mindLook(mindOn, mode);
  const body = bodyLook(bodyOn, mode);
  const heart = heartLook(heartOn, mode);
  const food = foodLook(foodOn, mode);

  return (
    <svg
      viewBox={VIEWBOX.male.front}
      className={cn("makeit-figure", className)}
      role="img"
      aria-label={ariaLabel}
      data-highlighted={highlightedDomains.join(" ") || undefined}
      data-mode={mode === "idle" ? undefined : mode}
      data-craft="v3a"
      overflow="visible"
    >
      <defs>
        <radialGradient
          id={heartVolumeGradId}
          cx="42%"
          cy="40%"
          r="68%"
        >
          <stop offset="0%" stopColor="var(--heart)" stopOpacity="0.85" />
          <stop offset="70%" stopColor="var(--heart)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--heart)" stopOpacity="0.08" />
        </radialGradient>
        {showFoodAura ? (
          <filter
            id={foodGlowFilterId}
            x="-16%"
            y="-8%"
            width="132%"
            height="116%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" />
          </filter>
        ) : null}
      </defs>

      {showFoodAura ? (
        <g className="makeit-figure-food-aura" data-domain="food" data-food-aura="full" aria-hidden>
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
            filter={`url(#${foodGlowFilterId})`}
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
          Always drawn: unlit = charcoal presence; lit = quiet --body relief.
          Teaching = quietest of the four (ghost), not an orange festival. */}
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
                fill={body.fill}
                fillOpacity={body.fillOpacity}
                stroke={body.stroke}
                strokeWidth={body.strokeWidth}
                strokeOpacity={body.strokeOpacity}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        ))}
      </g>

      {/* Mind = head. Traced from AnatomyFigure's head part.
          Teaching: softer so the blue outline does not own the figure. */}
      <g
        className={cn("makeit-figure-anchor", mindOn && "is-lit")}
        data-domain="mind"
        data-lit={mindOn || undefined}
      >
        {HEAD_PATHS.map((d, i) => (
          <path
            key={i}
            d={d}
            fill={mind.fill}
            fillOpacity={mind.fillOpacity}
            stroke={mind.stroke}
            strokeWidth={mind.strokeWidth}
            opacity={mind.opacity}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>

      {/* Heart = chest organ, person's left / viewer's right. */}
      <g
        className={cn("makeit-figure-anchor", heartOn && "is-lit")}
        data-domain="heart"
        data-heart="organ"
        data-lit={heartOn || undefined}
      >
        <path
          d={HEART_VOLUME}
          data-heart-layer="under"
          fill="none"
          stroke="var(--bg)"
          strokeWidth="5"
          opacity={heart.underOpacity}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={HEART_VOLUME}
          data-heart-layer="volume"
          fill={heartOn ? `url(#${heartVolumeGradId})` : "none"}
          fillOpacity={heartOn ? heart.volumeOpacity : 0}
          stroke={heart.stroke}
          strokeWidth="1.45"
          strokeOpacity={heart.strokeOpacity}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={HEART_CHAMBER}
          data-heart-layer="chamber"
          fill={heartOn ? "var(--heart)" : "none"}
          fillOpacity={heart.chamberOpacity}
          stroke="none"
        />
        <path
          d={HEART_SULCUS}
          data-heart-layer="sulcus"
          fill="none"
          stroke={heart.stroke}
          strokeWidth="1.1"
          strokeOpacity={heart.strokeOpacity * 0.55}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={HEART_VESSEL}
          data-heart-layer="vessel"
          fill="none"
          stroke={heart.stroke}
          strokeWidth="2.2"
          strokeOpacity={heart.vesselOpacity}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>

      {/* Food = J-stomach / coils as the anchor. Full halo only in focus. */}
      <g
        className={cn("makeit-figure-anchor", foodOn && "is-lit")}
        data-domain="food"
        data-lit={foodOn || undefined}
        data-food-aura={showFoodAura ? "full" : foodOn ? "ghost" : undefined}
      >
        <path
          d={GUT_STOMACH}
          data-gut="stomach"
          fill={food.fill}
          fillOpacity={food.fillOpacity}
          stroke={food.stroke}
          strokeWidth="1.4"
          opacity={food.opacity}
          vectorEffect="non-scaling-stroke"
        />
        {GUT_COILS.map((d, i) => (
          <path
            key={i}
            d={d}
            data-gut="coil"
            fill="none"
            stroke={food.stroke}
            strokeWidth="1.4"
            opacity={food.opacity}
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
            cx="396"
            cy="560"
            rx="92"
            ry="108"
            fill="transparent"
            className="cursor-pointer"
            onPointerEnter={() => onDomainHover("food")}
          />
          <ellipse
            data-hotzone="heart"
            cx="400"
            cy="400"
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
