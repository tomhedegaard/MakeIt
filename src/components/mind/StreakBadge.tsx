/**
 * Streak display — current / longest. Tiny presentational component.
 */
export default function StreakBadge({
  current,
  longest,
}: {
  current: number;
  longest: number;
}) {
  return (
    <div className="inline-flex items-baseline gap-3 rounded-full border hairline bg-bg-2/40 px-4 py-2">
      <span className="font-display text-2xl tabular-nums text-domain">{current}</span>
      <span className="text-fg-dim text-sm">dages stribe</span>
      {longest > current ? (
        <span className="text-fg-dim text-xs">
          · længste: <span className="tabular-nums">{longest}</span>
        </span>
      ) : null}
    </div>
  );
}
