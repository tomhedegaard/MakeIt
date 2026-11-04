import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * The MakeIt A: two stacked chevrons, the A in the MAKEIT wordmark
 * (Logos/A only.ai, traced 2026-11-04). In HQ it is the sender's
 * signature, not a sign (docs/BRAND_MARK.md): it stands in x-height in
 * front of "MakeIt // HQ", under "HQ" on login as "by MakeIt", and at
 * full size only in the app icon. Everything is currentColor, so it
 * follows ink and nat without a variant of its own.
 *
 * Two readings of the same shape live here too, so the brand runs
 * through the data without a second icon language:
 *   ReadyMark  the A as a three-step readiness meter (lav, midt, ro)
 *   UpMark     the outer chevron alone, where something went up
 */

/** Outer chevron (the thick band) and inner chevron, in the file's own units. */
const OUTER =
  "M499.4 386.8L419.9 254.2 294.6 45h-1.9L145.3 291.3l-11.4 19.4L54.4 443.6h64.3l42.4-70.8 79.4-132.8 52.5-87.7h1.9l83.3 139 11.5 19.2 79.5 132.7h64.2z";
const INNER = "M293.7 197.4L146.3 443.7h64.4l83.1-139h1.9l83.3 139h64.2L295.6 197.4z";

/** The drawing's box in those units: x 54–533, y 45–444. */
const VIEW = "54 45 479 399";

type SvgProps = Omit<ComponentProps<"svg">, "viewBox" | "children">;

/** The brand mark. Size it with a height class; width follows (1.2 : 1). */
export default function MakeItMark({ className, ...rest }: SvgProps) {
  return (
    <svg viewBox={VIEW} fill="currentColor" aria-hidden="true" className={cn("h-[1em] w-auto shrink-0", className)} {...rest}>
      <path d={OUTER} />
      <path d={INNER} />
    </svg>
  );
}

export type ReadyLevel = 1 | 2 | 3;

/**
 * The A as a readiness meter. The inner chevron is always lit; the
 * outer is outlined at 2 and filled at 3, so the three steps differ in
 * shape, not only in opacity. Pass the label the copy already has
 * (Lav, Midt, Ro) so screen readers get words, not a count.
 */
export function ReadyMark({ level, label, className }: { level: ReadyLevel; label: string; className?: string }) {
  return (
    <svg
      viewBox={VIEW}
      role="img"
      aria-label={label}
      data-ready-level={level}
      className={cn("h-[1em] w-auto shrink-0", className)}
    >
      <path d={INNER} fill="currentColor" />
      {level === 1 ? (
        <path d={OUTER} fill="currentColor" fillOpacity={0.18} />
      ) : level === 2 ? (
        <path d={OUTER} fill="none" stroke="currentColor" strokeWidth={14} strokeLinejoin="miter" />
      ) : (
        <path d={OUTER} fill="currentColor" />
      )}
    </svg>
  );
}

/** The outer chevron alone: the up sign. Down is a line, never this turned over. */
export function UpMark({ className, ...rest }: SvgProps) {
  return (
    <svg viewBox="54 45 479 399" fill="currentColor" aria-hidden="true" className={cn("h-[0.8em] w-auto shrink-0", className)} {...rest}>
      <path d={OUTER} />
    </svg>
  );
}
