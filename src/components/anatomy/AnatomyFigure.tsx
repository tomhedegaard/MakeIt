/**
 * Stylized anatomical figure for exercise muscle-targeting.
 *
 * Path data extracted from react-native-body-highlighter
 * (HichamELBSI, MIT) — see src/lib/data/anatomy/paths.ts for the
 * full attribution. We render plain web SVG (no react-native-svg
 * dependency) and apply MakeIt's tier-based highlight system on top.
 *
 * Tier colors:
 *   primary[]   → brand cream at 100%
 *   secondary[] → warm amber at 100%
 *   tertiary[]  → warm amber at 40% (engaged but minor contribution)
 *   inactive    → blends into body silhouette
 *
 * Same muscle can appear in both views (traps + triceps + forearms +
 * calves are visible from both front and back), so highlighting one
 * group lights it up regardless of view.
 */
import type { CSSProperties } from "react";
import { slugToMuscle, type MuscleGroup } from "@/lib/data/muscle-groups";
import {
  OUTLINES,
  PARTS,
  VIEWBOX,
  type AnatomyGender,
  type AnatomyView,
  type RnbhBodyPart,
} from "@/lib/data/anatomy/paths";

const COLORS = {
  body: "#1a1a1c", // base silhouette fill
  body_outline: "#3a3a3e", // edge stroke + non-muscle parts (joints, hands, head)
  inactive: "#222226", // muscles not targeted — blends with body
  tertiary: "#C97B3E", // warm amber, low opacity
  secondary: "#C97B3E", // warm amber, high opacity
  primary: "#F5F2EC", // brand cream
} as const;

export default function AnatomyFigure({
  view = "front",
  gender = "male",
  primary = [],
  secondary = [],
  tertiary = [],
  className,
  style,
}: {
  view?: AnatomyView;
  gender?: AnatomyGender;
  primary?: MuscleGroup[];
  secondary?: MuscleGroup[];
  tertiary?: MuscleGroup[];
  className?: string;
  style?: CSSProperties;
}) {
  const primarySet = new Set(primary);
  const secondarySet = new Set(secondary);
  const tertiarySet = new Set(tertiary);

  function tierFor(m: MuscleGroup | null): "primary" | "secondary" | "tertiary" | null {
    if (!m) return null;
    if (primarySet.has(m)) return "primary";
    if (secondarySet.has(m)) return "secondary";
    if (tertiarySet.has(m)) return "tertiary";
    return null;
  }

  const parts = PARTS[gender][view];
  const outline = OUTLINES[gender][view];
  const viewBox = VIEWBOX[gender][view];

  return (
    <svg
      viewBox={viewBox}
      className={className}
      style={style}
      role="img"
      aria-label={
        view === "front"
          ? `Anatomi-figur forfra (${gender === "male" ? "mand" : "kvinde"})`
          : `Anatomi-figur bagfra (${gender === "male" ? "mand" : "kvinde"})`
      }
    >
      {/* Body silhouette — single closed outline path */}
      <path
        d={outline}
        fill={COLORS.body}
        stroke={COLORS.body_outline}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />

      {/* Muscle parts on top */}
      {parts.map((part) => (
        <MuscleGroupPaths
          key={part.slug}
          part={part}
          tier={tierFor(slugToMuscle(part.slug, view))}
        />
      ))}
    </svg>
  );
}

function MuscleGroupPaths({
  part,
  tier,
}: {
  part: RnbhBodyPart;
  tier: "primary" | "secondary" | "tertiary" | null;
}) {
  const fill =
    tier === "primary"
      ? COLORS.primary
      : tier === "secondary"
      ? COLORS.secondary
      : tier === "tertiary"
      ? COLORS.tertiary
      : COLORS.inactive;
  const opacity =
    tier === "primary"
      ? 1
      : tier === "secondary"
      ? 0.95
      : tier === "tertiary"
      ? 0.4
      : 0.55;

  const paths: string[] = [
    ...(part.path.common ?? []),
    ...(part.path.left ?? []),
    ...(part.path.right ?? []),
  ];

  return (
    <g
      data-muscle={part.slug}
      style={{
        transition: "fill 0.3s ease, opacity 0.3s ease",
      }}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} fill={fill} opacity={opacity} />
      ))}
    </g>
  );
}
