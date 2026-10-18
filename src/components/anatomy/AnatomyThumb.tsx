/**
 * Muskelfiguren til lister: samme tegning som AnatomyFigure, men uden
 * egne stier. Silhuetten og hver fremhævet muskel hentes med <use> fra
 * AnatomySprite, som skal stå én gang på siden.
 *
 * Ingen hooks og intet "use client", så den kan renderes på serveren og
 * ikke hydreres som komponent. Navnet (aria-label) gives af kalderen.
 */
import type { CSSProperties } from "react";
import { VIEWBOX, type AnatomyView } from "@/lib/data/anatomy/paths";
import { ANATOMY_COLORS, highlightedParts, spriteBaseId, spritePartId } from "@/lib/data/anatomy/sprite";
import type { MuscleGroup } from "@/lib/data/muscle-groups";

export default function AnatomyThumb({
  view,
  label,
  primary = [],
  secondary = [],
  tertiary = [],
  className,
  style,
}: {
  view: AnatomyView;
  label: string;
  primary?: MuscleGroup[];
  secondary?: MuscleGroup[];
  tertiary?: MuscleGroup[];
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg viewBox={VIEWBOX.male[view]} role="img" aria-label={label} className={className} style={style}>
      <use href={`#${spriteBaseId(view)}`} />
      {highlightedParts(view, { primary, secondary, tertiary }).map(({ slug, tier }) => (
        <use key={slug} href={`#${spritePartId(view, slug)}`} style={{ fill: ANATOMY_COLORS[tier] }} />
      ))}
    </svg>
  );
}
