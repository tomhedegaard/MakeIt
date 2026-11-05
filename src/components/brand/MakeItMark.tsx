import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { COMPANY } from "@/lib/company";

/**
 * The MakeIt A: two stacked chevrons, the A in the MAKEIT wordmark
 * (Logos/A only.ai, traced 2026-11-04). In HQ, MakeIt is the sender,
 * not the sign (docs/BRAND_MARK.md): the name is "HQ", and MakeIt
 * signs it as "by MAKEIT" with the wordmark below. The A stands alone
 * at full size only in the app icon. Everything is currentColor, so it
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

/**
 * The MAKEIT wordmark (Logos/MAKEIT (only).ai, traced 2026-11-05), moved
 * to its own origin: 580 × 121. MAKE is ink and IT is quieter, as in
 * the file. It has one place in HQ: the by-line under or beside "HQ".
 */
const WORD_MAKE =
  "M114.7 0.1L115.1 120.1L91.5 120.2L91.4 69.2L57.8 118.3L57.6 118.3L23.7 69.4L23.9 120.4L0.3 120.5L0 0.4L1.3 0.4L57.6 77.7L113.4 0.1Z" +
  "M258.2 102.8L258.2 102.8L234.2 62.9L234.1 62.9L196.2 0L195.6 0L151.4 74.3L151.5 74.3L148 80.2L148 80.2L124.1 120.3L143.5 120.2L156.2 98.9L156.2 98.9L180.1 58.8L180 58.8L195.8 32.3L196.3 32.3L221.5 74.1L221.5 74.1L225 79.9L225 79.9L249.1 119.9L268.4 119.8Z" +
  "M196.1 45.9L151.9 120.3L171.2 120.2L196.2 78.3L196.8 78.3L222 120.1L241.3 120L196.6 45.9Z" +
  "M334 118.6L298.3 67.4L298.4 118.7L275 118.7L274.6 1.6L298.1 1.6L298.3 52.2L331 1.5L358.2 1.4L320.8 58.8L362.7 118.5Z" +
  "M397.1 24.5L397.2 47.4L437.6 47.2L437.7 70.7L397.3 70.8L397.3 95L444.4 94.9L444.5 118.3L373.9 118.5L373.5 1.4L444.2 1.2L444.2 24.3Z";
const WORD_IT =
  "M461.4 1.1L485 1.1L485.3 118.2L461.8 118.2Z" +
  "M579.5 24.1L550.7 24.2L551 118L527.4 118.1L527.1 24.3L498.3 24.3L498.2 1L579.4 0.8Z";

/** The wordmark. Size it with a height class; width follows (4.8 : 1). */
export function MakeItWordmark({ className, ...rest }: SvgProps) {
  return (
    <svg
      viewBox="0 0 580 121"
      fill="currentColor"
      role="img"
      aria-label={COMPANY.name}
      className={cn("h-[0.8em] w-auto shrink-0", className)}
      {...rest}
    >
      <path d={WORD_MAKE} />
      <path d={WORD_IT} fillOpacity={0.6} />
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
