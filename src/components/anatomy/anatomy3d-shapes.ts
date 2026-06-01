/**
 * SVG-to-Three.Shape extraction for the 3D anatomy figure.
 *
 * We already have the body outline and per-muscle path-d strings in
 * src/lib/data/anatomy/paths.ts (extracted from
 * react-native-body-highlighter, MIT, HichamELBSI). The 3D figure
 * reuses that data verbatim — it's the same model, just extruded —
 * so members see the exact silhouette they recognise from the 2D
 * SVG, only in 3D.
 *
 * SVGLoader parses an XML document, not raw path-d strings, so we
 * wrap each muscle's path list in a synthetic SVG with the matching
 * viewBox before parsing. The result is a list of THREE.Shape that
 * ExtrudeGeometry can consume directly.
 *
 * Y axis: SVG runs y+ downwards, Three runs y+ upwards. SVGLoader
 * preserves the SVG coordinates, so the caller flips y at the mesh
 * level (`scale.y = -1`) instead of mutating the shapes.
 */

import { SVGLoader } from "three-stdlib";
import type { Shape } from "three";
import {
  OUTLINES,
  PARTS,
  VIEWBOX,
  type AnatomyGender,
  type AnatomyView,
  type RnbhBodyPart,
} from "@/lib/data/anatomy/paths";

export type Anatomy3DPart = {
  slug: RnbhBodyPart["slug"];
  shapes: Shape[];
};

export type Anatomy3DGeometry = {
  /** viewBox as { minX, minY, width, height } for centering. */
  viewBox: { minX: number; minY: number; width: number; height: number };
  /** Body silhouette as Three.Shape[]. */
  outline: Shape[];
  /** One entry per muscle group with all its sub-paths flattened. */
  parts: Anatomy3DPart[];
};

const loader = new SVGLoader();

function parseViewBox(vb: string) {
  const [minX, minY, width, height] = vb.split(/\s+/).map(Number);
  return { minX, minY, width, height };
}

function pathsToSvg(viewBox: string, ds: string[]): string {
  // Each <path> becomes a separate ShapePath after parsing. Fill+stroke
  // attrs are required so SVGLoader treats them as fillable shapes.
  const inner = ds
    .map((d) => `<path d="${d}" fill="#000" stroke="none"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${inner}</svg>`;
}

function dsToShapes(viewBox: string, ds: string[]): Shape[] {
  if (ds.length === 0) return [];
  const svg = pathsToSvg(viewBox, ds);
  const result = loader.parse(svg);
  const shapes: Shape[] = [];
  for (const shapePath of result.paths) {
    shapes.push(...SVGLoader.createShapes(shapePath));
  }
  return shapes;
}

function flattenPart(part: RnbhBodyPart): string[] {
  return [
    ...(part.path.common ?? []),
    ...(part.path.left ?? []),
    ...(part.path.right ?? []),
  ];
}

/**
 * Memoized extraction: parsing the OUTLINES + all PARTS is several
 * hundred milliseconds and produces hundreds of vertices. We only
 * have male/female × front/back = 4 combinations, and the result is
 * stable for the lifetime of the page, so a module-level Map cache
 * is enough.
 */
const cache = new Map<string, Anatomy3DGeometry>();

export function getAnatomy3DGeometry(
  gender: AnatomyGender,
  view: AnatomyView,
): Anatomy3DGeometry {
  const key = `${gender}:${view}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const viewBoxStr = VIEWBOX[gender][view];
  const viewBox = parseViewBox(viewBoxStr);
  const outline = dsToShapes(viewBoxStr, [OUTLINES[gender][view]]);
  const parts: Anatomy3DPart[] = PARTS[gender][view].map((p) => ({
    slug: p.slug,
    shapes: dsToShapes(viewBoxStr, flattenPart(p)),
  }));

  const geom = { viewBox, outline, parts };
  cache.set(key, geom);
  return geom;
}
