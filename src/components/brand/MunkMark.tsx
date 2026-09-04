import { cn } from "@/lib/utils";

/**
 * Munk attribution — typography, not a drawn person.
 * CDO: coach is type. Initials + name. Never a face, never sparkle.
 */
export default function MunkMark({
  className,
  name = "Munk",
}: {
  className?: string;
  name?: string;
}) {
  const initial = (name.trim()[0] ?? "M").toUpperCase();
  return (
    <span
      data-munk-mark=""
      className={cn("inline-flex items-center gap-2 min-w-0", className)}
    >
      <span
        className="size-6 rounded-full border hairline-strong flex items-center justify-center font-display text-[11px] leading-none shrink-0"
        aria-hidden
      >
        {initial}
      </span>
      <span className="text-[10px] font-mono uppercase tracking-[0.14em] truncate">
        {name}
      </span>
    </span>
  );
}
