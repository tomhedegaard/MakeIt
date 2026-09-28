/**
 * Stylized anatomical figure for exercise muscle-targeting.
 *
 * Path data extracted from react-native-body-highlighter
 * (HichamELBSI, MIT) — see src/lib/data/anatomy/paths.ts for the
 * full attribution. We render plain web SVG (no react-native-svg
 * dependency) and apply MakeIt's tier-based highlight system on top.
 *
 * Tier colors (Nord, spec §11): the worked muscle is ALWAYS the Krop
 * colour, at three strengths — the same language as the 3D loops' red
 * highlight and the exercise page's chips:
 *   primary[]   → --muscle-primary   (Krop, full)
 *   secondary[] → --muscle-secondary (Krop mixed 50 % into the surface)
 *   tertiary[]  → --muscle-tertiary  (Krop mixed 24 %)
 *   inactive    → --anatomy-idle, a shade off the flat silhouette
 *
 * Same muscle can appear in both views (traps + triceps + forearms +
 * calves are visible from both front and back), so highlighting one
 * group lights it up regardless of view.
 */
"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
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
  body: "var(--anatomy-body)", // flat silhouette
  body_outline: "var(--anatomy-edge)", // 1 px edge
  inactive: "var(--anatomy-idle)", // muscles not targeted
  tertiary: "var(--muscle-tertiary)",
  secondary: "var(--muscle-secondary)",
  primary: "var(--muscle-primary)",
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
  const t = useTranslations("Train.anatomy");
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
          ? t("figureFront", {
              gender: gender === "male" ? t("genderMale") : t("genderFemale"),
            })
          : t("figureBack", {
              gender: gender === "male" ? t("genderMale") : t("genderFemale"),
            })
      }
    >
      {/* Body silhouette — single closed outline path.
          fill/stroke set via style: SVG presentation attributes don't
          reliably accept var() in Safari. */}
      <path
        d={outline}
        style={{ fill: COLORS.body, stroke: COLORS.body_outline }}
        strokeWidth="1"
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
  // The tiers are opaque mixes, so every tier renders at full opacity;
  // only a muscle nobody works fades into the silhouette.
  const opacity = tier ? 1 : 0.7;

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
        <path key={i} d={d} style={{ fill }} opacity={opacity} />
      ))}
    </g>
  );
}
