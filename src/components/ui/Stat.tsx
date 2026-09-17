/**
 * A single number: label, mono value, and an optional monochrome delta.
 * For the richer "new" / "stable" / percent trend states, keep using the
 * dashboard's existing TrendArrow — Stat only covers a plain signed number.
 */
export default function Stat({
  label,
  value,
  unit,
  delta,
  deltaLabel,
}: {
  label: string;
  value: string | number;
  unit?: string;
  delta?: number;
  deltaLabel?: string;
}) {
  const arrow = delta === undefined ? null : delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
  const magnitude = delta === undefined ? null : Math.abs(delta);

  return (
    <div className="flex flex-col gap-1">
      <p className="eyebrow">{label}</p>
      <p className="font-mono tabular-nums text-2xl">
        {value}
        {unit ? <span className="text-fg-dim text-base ml-1">{unit}</span> : null}
      </p>
      {delta === undefined ? null : (
        <p className="font-mono text-xs text-fg-dim">
          {arrow} {magnitude}
          {deltaLabel ? <span className="sr-only"> {deltaLabel}</span> : null}
        </p>
      )}
    </div>
  );
}
