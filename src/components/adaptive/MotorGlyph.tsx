import { cn } from "@/lib/utils";

/**
 * Motor mark — Adaptive Engine attribution.
 *
 * Stroke language matches DomainMark (1.6, round caps, currentColor).
 * A gear, not a face. No personality, no sparkle.
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
      <circle
        cx="12"
        cy="12"
        r="3.1"
        stroke="currentColor"
        strokeWidth={1.6}
      />
      <path
        d="M12 4.2v2.1M12 17.7v2.1M4.2 12h2.1M17.7 12h2.1M6.4 6.4l1.5 1.5M16.1 16.1l1.5 1.5M6.4 17.6l1.5-1.5M16.1 7.9l1.5-1.5"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}
