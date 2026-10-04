import { cn } from "@/lib/utils";

/**
 * The one progress bar: a 1 px-framed track with a mos fill (spec §5).
 * Carries progressbar semantics so the value is read, not just seen.
 */
export default function Progress({
  value,
  max = 100,
  label,
  valueText,
  className,
}: {
  value: number;
  max?: number;
  /** Accessible name, e.g. "100K volumen-club". */
  label: string;
  /** Spoken value, e.g. "68,4 af 100.000 kg". Defaults to a percentage. */
  valueText?: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      className={cn("h-1 w-full bg-line overflow-hidden", className)}
    >
      <div className="h-full w-full origin-left bg-signal transition-transform duration-200 ease-out" style={{ transform: `scaleX(${pct / 100})` }} />
    </div>
  );
}
