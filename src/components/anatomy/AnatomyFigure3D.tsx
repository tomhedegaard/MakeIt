"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { DoubleSide, ExtrudeGeometry, Shape } from "three";
import {
  slugToMuscle,
  type AnatomyView,
  type MuscleGroup,
} from "@/lib/data/muscle-groups";
import type { AnatomyGender } from "@/lib/data/anatomy/paths";
import {
  getAnatomy3DGeometry,
  type Anatomy3DGeometry,
} from "./anatomy3d-shapes";

/**
 * 3D variant of <AnatomyFigure>. Same API (primary/secondary/tertiary
 * muscle groups, gender, view) — same muscle taxonomy, same brand
 * palette, same tier semantics. The figure is rendered as a
 * "paper-doll": two extruded slabs (front + back), back-to-back, so
 * when the camera orbits behind the figure the user sees the BACK
 * view's muscle layout, not the back of the FRONT extrusion. This is
 * the literal 3D-isation of the existing 2D figure rather than a
 * separate sculpted model — we trade anatomical depth for visual
 * consistency with what members already know.
 *
 * Performance: shape extraction is memoized at module scope in
 * anatomy3d-shapes.ts (4 combinations cached forever), and the
 * extruded geometry is memoized per `(gender)` here. Coloring per
 * tier happens via material props — no geometry rebuild.
 */

const COLORS = {
  body: "#1a1a1c",
  body_edge: "#3a3a3e",
  inactive: "#222226",
  primary: "#F5F2EC",
  secondary: "#C97B3E",
  tertiary: "#C97B3E",
} as const;

const EXTRUDE_OUTLINE = { depth: 18, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 2, steps: 1 };
const EXTRUDE_MUSCLE = { depth: 6, bevelEnabled: false, steps: 1 };

export default function AnatomyFigure3D({
  primary = [],
  secondary = [],
  tertiary = [],
  gender = "male",
  initialView = "front",
  className,
  style,
}: {
  primary?: MuscleGroup[];
  secondary?: MuscleGroup[];
  tertiary?: MuscleGroup[];
  gender?: AnatomyGender;
  /**
   * Where the camera looks first. Members can orbit freely from there;
   * we don't snap to discrete front/back views in 3D mode.
   */
  initialView?: AnatomyView;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={className} style={style}>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: cameraForView(initialView), fov: 35, near: 0.1, far: 100 }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 6, 5]} intensity={1.1} />
        <directionalLight position={[-4, 3, -4]} intensity={0.35} />

        <Figure
          gender={gender}
          initialView={initialView}
          primary={primary}
          secondary={secondary}
          tertiary={tertiary}
        />

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI * 0.25}
          maxPolarAngle={Math.PI * 0.75}
        />
      </Canvas>
    </div>
  );
}

function cameraForView(view: AnatomyView): [number, number, number] {
  // Camera distance picked so the ~5-unit-tall figure fits comfortably
  // with the 35° FOV: half-height 2.5 / tan(17.5°) ≈ 7.9 → distance 8.
  return view === "front" ? [0, 0, 8] : [0, 0, -8];
}

function Figure({
  gender,
  initialView,
  primary,
  secondary,
  tertiary,
}: {
  gender: AnatomyGender;
  initialView: AnatomyView;
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  tertiary: MuscleGroup[];
}) {
  // Render whichever single view the caller asked for. Front and back
  // viewBoxes sit in different x-ranges in the source data
  // (back viewBox starts at x=724), so each view normalises against
  // its own bounds and renders as one centered extruded slab. Members
  // who want to see the other side switch view via the parent UI;
  // OrbitControls let them rotate this slab freely to inspect depth.
  const view = initialView;
  const geom = useMemo(() => getAnatomy3DGeometry(gender, view), [gender, view]);
  const transform = useMemo(() => normalizationTransform(geom), [geom]);

  const primarySet = useMemo(() => new Set(primary), [primary]);
  const secondarySet = useMemo(() => new Set(secondary), [secondary]);
  const tertiarySet = useMemo(() => new Set(tertiary), [tertiary]);

  function tierFor(m: MuscleGroup | null) {
    if (!m) return null;
    if (primarySet.has(m)) return "primary" as const;
    if (secondarySet.has(m)) return "secondary" as const;
    if (tertiarySet.has(m)) return "tertiary" as const;
    return null;
  }

  // The y-flip (SVG y+ down → Three y+ up) inverts triangle windings,
  // which would hide front-faces on default-sided materials. We use
  // DoubleSide on every material so both sides render the same flat-
  // shaded colour — the figure is non-photorealistic anyway, so lack
  // of one-sided lighting nuance is a non-issue.
  return (
    <group
      scale={[transform.scale, -transform.scale, transform.scale]}
      position={transform.position}
    >
      <Slab geometry={geom} view={view} tierFor={tierFor} />
    </group>
  );
}

function Slab({
  geometry,
  view,
  tierFor,
}: {
  geometry: Anatomy3DGeometry;
  view: AnatomyView;
  tierFor: (m: MuscleGroup | null) => "primary" | "secondary" | "tertiary" | null;
}) {
  const outlineGeom = useMemo(
    () => extrude(geometry.outline, EXTRUDE_OUTLINE),
    [geometry.outline],
  );

  return (
    <group>
      <mesh geometry={outlineGeom} castShadow receiveShadow>
        <meshStandardMaterial
          color={COLORS.body}
          roughness={0.85}
          metalness={0}
          side={DoubleSide}
        />
      </mesh>

      {geometry.parts.map((part) => (
        <MusclePart
          key={part.slug}
          part={part}
          tier={tierFor(slugToMuscle(part.slug, view))}
        />
      ))}
    </group>
  );
}

function MusclePart({
  part,
  tier,
}: {
  part: { slug: string; shapes: Shape[] };
  tier: "primary" | "secondary" | "tertiary" | null;
}) {
  const geom = useMemo(
    () => (part.shapes.length > 0 ? extrude(part.shapes, EXTRUDE_MUSCLE) : null),
    [part.shapes],
  );
  if (!geom) return null;

  const color =
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

  // Sit the muscle ON TOP of the body slab's front face. ExtrudeGeometry
  // runs the slab from z=0 to z=depth; bevel adds another ~bevelSize on
  // top of that. We need the muscle entirely in front of the bevelled
  // front face — otherwise the body silhouette occludes it and the
  // muscle reads as the same charcoal as the body.
  return (
    <mesh
      geometry={geom}
      position={[
        0,
        0,
        EXTRUDE_OUTLINE.depth + EXTRUDE_OUTLINE.bevelSize + 0.5,
      ]}
      castShadow
    >
      <meshStandardMaterial
        color={color}
        opacity={opacity}
        transparent={opacity < 1}
        roughness={0.6}
        metalness={0}
        side={DoubleSide}
      />
    </mesh>
  );
}

function extrude(shapes: Shape[], settings: ConstructorParameters<typeof ExtrudeGeometry>[1]) {
  return new ExtrudeGeometry(shapes, settings);
}

/**
 * Map the raw SVG coordinate space (viewBox) to a centered, ~5-unit
 * tall figure at the origin. We invert y here (SVG y+ → Three y+ flip)
 * by scaling y negatively in the caller.
 */
function normalizationTransform(geom: Anatomy3DGeometry) {
  const { viewBox } = geom;
  const TARGET_HEIGHT = 5; // world units
  const scale = TARGET_HEIGHT / viewBox.height;
  // Center horizontally; y is flipped, so centering the viewBox vertically
  // in world space requires accounting for the inversion at render time.
  const cx = viewBox.minX + viewBox.width / 2;
  const cy = viewBox.minY + viewBox.height / 2;
  return {
    scale,
    position: [-cx * scale, cy * scale, 0] as [number, number, number],
  };
}
