import { cn } from "@/lib/utils";

/**
 * HQ mark — Adaptive Engine attribution (Nord, spec §11).
 *
 * HQ's voice mark: the double slash, drawn as two 1.5 px strokes with
 * square ends so it sits in the one icon language. It says "this came
 * from HQ". A mark, not a face: no personality, no sparkle.
 */
export default function MotorGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-4 shrink-0", className)}
      data-motor-glyph=""
      aria-hidden
    >
      <path
        d="M10.5 5 6 19M18 5l-4.5 14"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="square"
      />
    </svg>
  );
}
