import { cn } from "@/lib/utils";

/**
 * Brand-aligned skeleton block. Uses the cream/grain palette via
 * surface tokens so it doesn't look like a generic shimmer.
 */
export function Skeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-md bg-fg/5 animate-pulse",
        className
      )}
    />
  );
}

/** Convenience: a stack of skeleton lines for text-shaped placeholders. */
export function SkeletonLines({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3", i === count - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}
