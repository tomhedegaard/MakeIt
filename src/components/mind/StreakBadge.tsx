/**
 * Streak display — current / longest. Tiny presentational component.
 * Labels come from Mind.check so DA/EN follow the member locale.
 */
export default function StreakBadge({
  current,
  longest,
  currentLabel,
  longestLabel,
}: {
  current: number;
  longest: number;
  currentLabel: string;
  longestLabel: string;
}) {
  return (
    <div className="inline-flex items-baseline gap-3 rounded-full border hairline bg-bg-2/40 px-4 py-2">
      <span className="font-display text-2xl tabular-nums text-domain">{current}</span>
      <span className="text-fg-dim text-sm">{currentLabel}</span>
      {longest > current ? (
        <span className="text-fg-dim text-xs">
          · {longestLabel}
        </span>
      ) : null}
    </div>
  );
}
