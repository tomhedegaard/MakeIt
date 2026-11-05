import { cn } from "@/lib/utils";
import MakeItMark, { MakeItWordmark } from "@/components/brand/MakeItMark";

/**
 * The product's name with its sender (docs/BRAND_MARK.md). HQ is the
 * product; MakeIt is who makes it, so the name is "HQ" and MakeIt signs
 * it with the wordmark: "HQ by MAKEIT".
 *
 *   full    one line, for bars: app and coach chrome, onboarding, legal
 *           pages, the landing nav.
 *   sender  stacked, "HQ" large with the by-line under it: login and the
 *           password pages, where HQ introduces itself.
 *   mark    the A alone, 24 px: where only a glyph fits.
 */
export default function Logo({
  className,
  variant = "full",
}: {
  className?: string;
  variant?: "full" | "mark" | "sender";
}) {
  if (variant === "mark") {
    return <MakeItMark className={cn("h-6", className)} />;
  }
  const stacked = variant === "sender";
  return (
    <div className={cn("flex select-none", stacked ? "flex-col gap-1.5" : "items-baseline gap-2", className)}>
      <span className={cn("font-display", stacked ? "text-title" : "text-section")}>HQ</span>
      <span className="flex items-baseline gap-1.5 text-micro text-fg-dim">
        by
        <MakeItWordmark className="text-fg" />
      </span>
    </div>
  );
}
