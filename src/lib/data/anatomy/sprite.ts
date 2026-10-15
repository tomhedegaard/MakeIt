/**
 * Den delte figur til lister med mange kort.
 *
 * En indlejret AnatomyFigure er ca. 35 kB SVG og 97 noder. I en liste
 * defineres silhuetten og musklerne derfor én gang pr. side
 * (AnatomySprite), og hver figur henviser til dem med <use>
 * (AnatomyThumb), så kun de fremhævede muskler er unikke pr. kort.
 *
 * Kun den mandlige figur: det er den, kortene viser.
 */
import { slugToMuscle, type MuscleGroup, type MuscleTier } from "@/lib/data/muscle-groups";
import { PARTS, type AnatomyView, type RnbhBodyPart, type RnbhSlug } from "./paths";

/** Figurens farver (Nord, spec §11). Deles af AnatomyFigure og den delte figur. */
export const ANATOMY_COLORS = {
  body: "var(--anatomy-body)", // flat silhouette
  body_outline: "var(--anatomy-edge)", // 1 px edge
  inactive: "var(--anatomy-idle)", // muscles not targeted
  tertiary: "var(--muscle-tertiary)",
  secondary: "var(--muscle-secondary)",
  primary: "var(--muscle-primary)",
} as const;

export const spriteBaseId = (view: AnatomyView) => `anatomy-${view}`;
export const spritePartId = (view: AnatomyView, slug: RnbhSlug) => `anatomy-${view}-${slug}`;

/** Alle en kropsdels stier som én sti. Hver sti begynder med absolut M og slutter med z, så de kan stå efter hinanden. */
export function partPath(part: RnbhBodyPart): string {
  return [...(part.path.common ?? []), ...(part.path.left ?? []), ...(part.path.right ?? [])].join(" ");
}

/** Hele visningens kropsdele som én sti: figuren, før nogen muskel er fremhævet. */
export function idlePath(view: AnatomyView): string {
  return PARTS.male[view].map(partPath).join(" ");
}

/** De kropsdele, en øvelse kan fremhæve. Led, hænder, fødder, hoved og hår er aldrig med. */
export function spriteParts(view: AnatomyView): RnbhBodyPart[] {
  return PARTS.male[view].filter((part) => slugToMuscle(part.slug, view) !== null);
}

/** De trænede muskler, der kan ses i visningen, i tegnerækkefølge. Den stærkeste styrke vinder. */
export function highlightedParts(
  view: AnatomyView,
  worked: { primary: MuscleGroup[]; secondary: MuscleGroup[]; tertiary: MuscleGroup[] },
): { slug: RnbhSlug; tier: MuscleTier }[] {
  const tierOf = (muscle: MuscleGroup): MuscleTier | null =>
    worked.primary.includes(muscle)
      ? "primary"
      : worked.secondary.includes(muscle)
        ? "secondary"
        : worked.tertiary.includes(muscle)
          ? "tertiary"
          : null;

  return spriteParts(view).flatMap((part) => {
    const muscle = slugToMuscle(part.slug, view);
    const tier = muscle ? tierOf(muscle) : null;
    return tier ? [{ slug: part.slug, tier }] : [];
  });
}
