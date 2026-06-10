import { cn } from "@/lib/utils";
import type { ReadinessBucket } from "@/lib/hrv/types";

/**
 * Presentational 5-segment vertical readiness ladder (V1.x §6).
 *
 * Pure server-renderable component — no state, no effects, no client island.
 * Renders buckets bottom-up (very_low at the bottom, very_high at the top).
 * The active bucket is a filled block, its neighbours are hairline outlines,
 * and distant segments are faint sketch lines. A `null` bucket means the
 * member is still warming up: all segments render in a uniform neutral
 * outline plus an explanatory caption.
 *
 * The filled / outline / sketch hierarchy is expressed through fill,
 * stroke weight, and opacity. The active bucket fills in the domain
 * color (heart, via the /hrv data-domain scope) — it is data-ink,
 * the one place color is allowed (docs/DOMAIN_COLOR_SYSTEM.md).
 */

/** Bottom-up order: index 0 is the bottom rung of the ladder. */
const LADDER_ORDER: ReadinessBucket[] = [
  "very_low",
  "low",
  "normal",
  "high",
  "very_high",
];

const BUCKET_LABELS: Record<ReadinessBucket, string> = {
  very_low: "Meget under din norm",
  low: "Under din norm",
  normal: "I dit normale område",
  high: "Over din norm",
  very_high: "Meget over din norm",
};

type SegmentTone = "filled" | "outline" | "sketch" | "neutral";

/** Distance from the active bucket determines a segment's visual tone. */
function toneFor(
  segment: ReadinessBucket,
  bucket: ReadinessBucket | null,
): SegmentTone {
  if (bucket === null) return "neutral";
  const distance = Math.abs(
    LADDER_ORDER.indexOf(segment) - LADDER_ORDER.indexOf(bucket),
  );
  if (distance === 0) return "filled";
  if (distance === 1) return "outline";
  return "sketch";
}

const TONE_CLASSES: Record<SegmentTone, string> = {
  // Solid block — the member's current readiness, in domain ink.
  filled: "bg-domain border border-domain",
  // Hairline outline — immediate neighbours.
  outline: "border border-line-strong",
  // Faint, thinner sketch line — distant segments.
  sketch: "border border-line opacity-45",
  // Uniform resting state while the baseline warms up.
  neutral: "border border-line opacity-60",
};

export default function ReadinessLadder({
  bucket,
}: {
  bucket: ReadinessBucket | null;
}) {
  // Render top-down for the DOM/visual stack (very_high first).
  const segments = [...LADDER_ORDER].reverse();

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex flex-col gap-1.5"
        role="img"
        aria-label={
          bucket === null
            ? "Readiness-stige — venter på baseline"
            : `Readiness: ${BUCKET_LABELS[bucket]}`
        }
      >
        {segments.map((segment) => {
          const tone = toneFor(segment, bucket);
          return (
            <div
              key={segment}
              className={cn(
                "h-3 rounded-sm",
                tone === "sketch" ? "h-1.5" : "h-3",
                TONE_CLASSES[tone],
              )}
            >
              <span className="sr-only">{BUCKET_LABELS[segment]}</span>
            </div>
          );
        })}
      </div>

      {bucket === null ? (
        <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint leading-relaxed">
          Readiness kommer når din baseline er klar
        </p>
      ) : (
        <p className="font-display text-base leading-tight text-fg">
          {BUCKET_LABELS[bucket]}
        </p>
      )}
    </div>
  );
}
