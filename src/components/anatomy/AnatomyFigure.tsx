/**
 * Stylized anatomical figure for exercise muscle-targeting.
 *
 * First-pass version — geometric/diagrammatic rather than
 * photorealistic. The muscle groups are positioned in roughly
 * anatomically correct locations, but proportions are simplified
 * for clarity at small sizes (Caliber/Jefit style).
 *
 * Highlighting:
 *   primary[]   → cream (#F5F2EC, brand fg) at full opacity
 *   secondary[] → amber (#C97B3E) at 80% opacity
 *   inactive    → bg-3 / charcoal at 70% opacity, ~invisible
 *
 * Iteration plan: this file is the single source of truth for the
 * figure. Tweak path coords + colors here; everything downstream
 * (exercise pages, coach console, /train flow) re-renders.
 */
import type { CSSProperties } from "react";
import type { MuscleGroup, AnatomyView } from "@/lib/data/muscle-groups";

const COLORS = {
  body: "#1a1a1c", // base skin / silhouette
  body_outline: "#3a3a3e", // edge stroke
  inactive: "#2a2a2e", // muscles not targeted
  secondary: "#C97B3E", // warm amber for secondary work
  primary: "#F5F2EC", // brand cream for primary work
  bone: "#0e0e10", // gaps + spine
} as const;

export default function AnatomyFigure({
  view = "front",
  primary = [],
  secondary = [],
  className,
  style,
}: {
  view?: AnatomyView;
  primary?: MuscleGroup[];
  secondary?: MuscleGroup[];
  className?: string;
  style?: CSSProperties;
}) {
  const primarySet = new Set(primary);
  const secondarySet = new Set(secondary);

  function fill(m: MuscleGroup): string {
    if (primarySet.has(m)) return COLORS.primary;
    if (secondarySet.has(m)) return COLORS.secondary;
    return COLORS.inactive;
  }
  function opacity(m: MuscleGroup): number {
    if (primarySet.has(m)) return 1;
    if (secondarySet.has(m)) return 0.85;
    return 0.55;
  }

  return (
    <svg
      viewBox="0 0 240 640"
      className={className}
      style={style}
      role="img"
      aria-label={
        view === "front" ? "Anatomi-figur forfra" : "Anatomi-figur bagfra"
      }
    >
      {view === "front" ? (
        <FrontView fill={fill} opacity={opacity} />
      ) : (
        <BackView fill={fill} opacity={opacity} />
      )}
    </svg>
  );
}

/* ====================================================================
 * Front view — what you'd see facing the figure
 * ==================================================================== */

function FrontView({
  fill,
  opacity,
}: {
  fill: (m: MuscleGroup) => string;
  opacity: (m: MuscleGroup) => number;
}) {
  return (
    <g>
      {/* Body silhouette — single closed path. Stylized: slightly
          wide shoulders, narrow waist, athletic legs. */}
      <path
        d="
          M 120 18
          C 102 18 88 32 88 52
          C 88 68 96 80 110 84
          L 110 100
          L 60 112
          C 46 115 38 124 38 136
          L 38 200
          C 38 212 42 220 50 226
          L 56 290
          C 58 308 52 318 50 330
          L 50 360
          L 60 360
          L 58 226
          L 75 226
          L 75 290
          L 88 290
          L 88 295
          L 80 480
          C 78 510 76 540 78 590
          L 78 622
          L 108 622
          L 110 590
          L 112 480
          L 116 320
          L 120 295
          L 124 320
          L 128 480
          L 130 590
          L 132 622
          L 162 622
          L 162 590
          C 164 540 162 510 160 480
          L 152 295
          L 152 290
          L 165 290
          L 165 226
          L 182 226
          L 180 360
          L 190 360
          L 190 330
          C 188 318 182 308 184 290
          L 190 226
          C 198 220 202 212 202 200
          L 202 136
          C 202 124 194 115 180 112
          L 130 100
          L 130 84
          C 144 80 152 68 152 52
          C 152 32 138 18 120 18 Z"
        fill={COLORS.body}
        stroke={COLORS.body_outline}
        strokeWidth="1"
      />

      {/* Neck */}
      <Muscle
        m="neck"
        fill={fill}
        opacity={opacity}
        path="M 108 86 L 132 86 L 134 102 L 106 102 Z"
      />

      {/* Pectorals (chest) — two rounded slabs */}
      <Muscle
        m="chest"
        fill={fill}
        opacity={opacity}
        path="
          M 65 122
          C 60 122 54 128 54 138
          L 54 172
          C 54 180 62 186 78 188
          L 112 188
          C 116 188 118 184 118 178
          L 118 130
          C 118 126 116 122 112 122 Z
          M 175 122
          C 180 122 186 128 186 138
          L 186 172
          C 186 180 178 186 162 188
          L 128 188
          C 124 188 122 184 122 178
          L 122 130
          C 122 126 124 122 128 122 Z"
      />

      {/* Front deltoids — shoulder caps */}
      <Muscle
        m="front_delts"
        fill={fill}
        opacity={opacity}
        path="
          M 40 124
          C 42 138 46 152 54 162
          L 54 138
          C 54 130 48 124 42 124 Z
          M 200 124
          C 198 138 194 152 186 162
          L 186 138
          C 186 130 192 124 198 124 Z"
      />

      {/* Biceps — upper arm ovals */}
      <Muscle
        m="biceps"
        fill={fill}
        opacity={opacity}
        path="
          M 44 168
          C 38 170 36 180 38 194
          L 44 220
          C 47 224 53 224 56 220
          L 58 192
          C 58 178 52 168 46 168 Z
          M 196 168
          C 202 170 204 180 202 194
          L 196 220
          C 193 224 187 224 184 220
          L 182 192
          C 182 178 188 168 194 168 Z"
      />

      {/* Forearms */}
      <Muscle
        m="forearms"
        fill={fill}
        opacity={opacity}
        path="
          M 50 232
          C 47 234 46 248 50 280
          L 56 320
          C 58 328 64 328 64 320
          L 68 280
          C 68 256 64 232 58 232 Z
          M 190 232
          C 193 234 194 248 190 280
          L 184 320
          C 182 328 176 328 176 320
          L 172 280
          C 172 256 176 232 182 232 Z"
      />

      {/* Abs — 3 rows × 2 cols of rounded segments */}
      <Muscle
        m="abs"
        fill={fill}
        opacity={opacity}
        path="
          M 105 195 H 117 V 215 H 105 Z
          M 123 195 H 135 V 215 H 123 Z
          M 105 220 H 117 V 240 H 105 Z
          M 123 220 H 135 V 240 H 123 Z
          M 105 245 H 117 V 265 H 105 Z
          M 123 245 H 135 V 265 H 123 Z
          M 110 270 H 130 V 285 H 110 Z"
      />

      {/* Obliques — flanking the abs */}
      <Muscle
        m="obliques"
        fill={fill}
        opacity={opacity}
        path="
          M 88 200
          L 100 200
          L 100 280
          L 84 280
          C 82 270 84 240 88 200 Z
          M 152 200
          L 140 200
          L 140 280
          L 156 280
          C 158 270 156 240 152 200 Z"
      />

      {/* Quads — front thighs */}
      <Muscle
        m="quads"
        fill={fill}
        opacity={opacity}
        path="
          M 85 300
          C 80 320 78 380 82 450
          C 84 462 96 462 100 450
          L 108 320
          C 108 305 102 300 96 300 Z
          M 155 300
          C 160 320 162 380 158 450
          C 156 462 144 462 140 450
          L 132 320
          C 132 305 138 300 144 300 Z"
      />

      {/* Calves front (tibialis / shin) */}
      <Muscle
        m="calves_front"
        fill={fill}
        opacity={opacity}
        path="
          M 86 480
          C 84 510 82 540 84 580
          L 96 580
          L 98 480 Z
          M 154 480
          C 156 510 158 540 156 580
          L 144 580
          L 142 480 Z"
      />

      {/* Subtle center line down sternum + linea alba for visual anchor */}
      <line
        x1="120"
        y1="105"
        x2="120"
        y2="290"
        stroke={COLORS.bone}
        strokeWidth="0.7"
        opacity="0.5"
      />
    </g>
  );
}

/* ====================================================================
 * Back view
 * ==================================================================== */

function BackView({
  fill,
  opacity,
}: {
  fill: (m: MuscleGroup) => string;
  opacity: (m: MuscleGroup) => number;
}) {
  return (
    <g>
      {/* Same silhouette as front (mirror-symmetric body outline). */}
      <path
        d="
          M 120 18
          C 102 18 88 32 88 52
          C 88 68 96 80 110 84
          L 110 100
          L 60 112
          C 46 115 38 124 38 136
          L 38 200
          C 38 212 42 220 50 226
          L 56 290
          C 58 308 52 318 50 330
          L 50 360
          L 60 360
          L 58 226
          L 75 226
          L 75 290
          L 88 290
          L 88 295
          L 80 480
          C 78 510 76 540 78 590
          L 78 622
          L 108 622
          L 110 590
          L 112 480
          L 116 320
          L 120 295
          L 124 320
          L 128 480
          L 130 590
          L 132 622
          L 162 622
          L 162 590
          C 164 540 162 510 160 480
          L 152 295
          L 152 290
          L 165 290
          L 165 226
          L 182 226
          L 180 360
          L 190 360
          L 190 330
          C 188 318 182 308 184 290
          L 190 226
          C 198 220 202 212 202 200
          L 202 136
          C 202 124 194 115 180 112
          L 130 100
          L 130 84
          C 144 80 152 68 152 52
          C 152 32 138 18 120 18 Z"
        fill={COLORS.body}
        stroke={COLORS.body_outline}
        strokeWidth="1"
      />

      {/* Trapezius — large diamond at upper back */}
      <Muscle
        m="traps"
        fill={fill}
        opacity={opacity}
        path="
          M 120 88
          L 88 122
          L 78 170
          L 120 178
          L 162 170
          L 152 122 Z"
      />

      {/* Rear delts */}
      <Muscle
        m="rear_delts"
        fill={fill}
        opacity={opacity}
        path="
          M 40 124
          C 42 138 46 152 54 162
          L 56 138
          C 56 130 48 124 42 124 Z
          M 200 124
          C 198 138 194 152 186 162
          L 184 138
          C 184 130 192 124 198 124 Z"
      />

      {/* Triceps — back of upper arm */}
      <Muscle
        m="triceps"
        fill={fill}
        opacity={opacity}
        path="
          M 44 168
          C 38 172 38 188 40 200
          L 46 222
          C 48 226 54 226 56 222
          L 60 200
          C 60 184 54 168 48 168 Z
          M 196 168
          C 202 172 202 188 200 200
          L 194 222
          C 192 226 186 226 184 222
          L 180 200
          C 180 184 186 168 192 168 Z"
      />

      {/* Forearms (back-side — same outline ok at this fidelity) */}
      <Muscle
        m="forearms"
        fill={fill}
        opacity={opacity}
        path="
          M 50 232
          C 47 234 46 248 50 280
          L 56 320
          C 58 328 64 328 64 320
          L 68 280
          C 68 256 64 232 58 232 Z
          M 190 232
          C 193 234 194 248 190 280
          L 184 320
          C 182 328 176 328 176 320
          L 172 280
          C 172 256 176 232 182 232 Z"
      />

      {/* Lats — large wings flanking spine */}
      <Muscle
        m="lats"
        fill={fill}
        opacity={opacity}
        path="
          M 78 180
          C 70 200 64 230 70 268
          L 95 252
          L 102 200 Z
          M 162 180
          C 170 200 176 230 170 268
          L 145 252
          L 138 200 Z"
      />

      {/* Lower back / erector spinae — two long columns */}
      <Muscle
        m="lower_back"
        fill={fill}
        opacity={opacity}
        path="
          M 110 220 L 117 220 L 117 290 L 110 290 Z
          M 123 220 L 130 220 L 130 290 L 123 290 Z"
      />

      {/* Glutes */}
      <Muscle
        m="glutes"
        fill={fill}
        opacity={opacity}
        path="
          M 90 290
          C 84 295 82 310 84 322
          C 88 332 106 332 110 318
          L 110 295 Z
          M 150 290
          C 156 295 158 310 156 322
          C 152 332 134 332 130 318
          L 130 295 Z"
      />

      {/* Hamstrings */}
      <Muscle
        m="hamstrings"
        fill={fill}
        opacity={opacity}
        path="
          M 85 335
          C 82 360 80 410 84 460
          C 86 472 98 472 102 460
          L 108 350
          C 108 340 102 335 96 335 Z
          M 155 335
          C 158 360 160 410 156 460
          C 154 472 142 472 138 460
          L 132 350
          C 132 340 138 335 144 335 Z"
      />

      {/* Calves back — gastrocnemius */}
      <Muscle
        m="calves_back"
        fill={fill}
        opacity={opacity}
        path="
          M 86 482
          C 83 510 84 540 90 565
          C 95 570 102 564 104 540
          L 104 482 Z
          M 154 482
          C 157 510 156 540 150 565
          C 145 570 138 564 136 540
          L 136 482 Z"
      />

      {/* Spine line for visual anchor */}
      <line
        x1="120"
        y1="100"
        x2="120"
        y2="295"
        stroke={COLORS.bone}
        strokeWidth="0.7"
        opacity="0.5"
      />
    </g>
  );
}

/* Single muscle group. fill + opacity come from parent so the
 * highlight logic stays in one place. */
function Muscle({
  m,
  path,
  fill,
  opacity,
}: {
  m: MuscleGroup;
  path: string;
  fill: (m: MuscleGroup) => string;
  opacity: (m: MuscleGroup) => number;
}) {
  return (
    <path
      d={path}
      fill={fill(m)}
      opacity={opacity(m)}
      data-muscle={m}
      style={{ transition: "fill 0.3s ease, opacity 0.3s ease" }}
    />
  );
}
