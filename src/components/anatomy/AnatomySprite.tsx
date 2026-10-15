/**
 * Silhuetten og musklerne, som AnatomyThumb henviser til med <use>.
 * Sættes én gang på en side, der viser AnatomyThumb.
 *
 * Client component med vilje: så står stierne én gang i HTML'en og slet
 * ikke i RSC-payloaden, heller ikke når bibliotekets filtre skifter.
 */
"use client";

import { Fragment } from "react";
import { OUTLINES, type AnatomyView } from "@/lib/data/anatomy/paths";
import {
  ANATOMY_COLORS,
  idlePath,
  partPath,
  spriteBaseId,
  spritePartId,
  spriteParts,
} from "@/lib/data/anatomy/sprite";

const VIEWS: AnatomyView[] = ["front", "back"];

export default function AnatomySprite() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
      <defs>
        {VIEWS.map((view) => (
          <Fragment key={view}>
            {/* Figuren uden fremhævning: silhuet og alle muskler i hvile.
                fill/stroke sættes via style: SVG-attributter tager ikke
                var() pålideligt i Safari. */}
            <g id={spriteBaseId(view)}>
              <path
                d={OUTLINES.male[view]}
                style={{ fill: ANATOMY_COLORS.body, stroke: ANATOMY_COLORS.body_outline }}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <path d={idlePath(view)} style={{ fill: ANATOMY_COLORS.inactive }} opacity={0.7} />
            </g>
            {/* Én sti pr. muskel uden egen farve: den arves fra det <use>, der henter den. */}
            {spriteParts(view).map((part) => (
              <path key={part.slug} id={spritePartId(view, part.slug)} d={partPath(part)} />
            ))}
          </Fragment>
        ))}
      </defs>
    </svg>
  );
}
