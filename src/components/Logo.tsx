import { cn } from "@/lib/utils";
import { COMPANY } from "@/lib/company";
import MakeItMark from "@/components/brand/MakeItMark";

/**
 * The product's name with the sender's signature (docs/BRAND_MARK.md).
 *
 *   full    "MakeIt // HQ" in the house face with the MakeIt A in
 *           x-height in front: app and coach chrome, onboarding, legal
 *           pages, the landing nav.
 *   mark    the A alone, 24 px: where only a glyph fits.
 *   sender  "HQ" large with "by MakeIt" under it: login and the
 *           password pages, where HQ introduces itself and MakeIt
 *           signs. HQ is the product; MakeIt is who makes it.
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
  if (variant === "sender") {
    return (
      <div className={cn("flex flex-col gap-1.5 select-none", className)} aria-label={COMPANY.product}>
        <span className="font-display text-title">HQ</span>
        <span className="flex items-center gap-1.5 text-micro text-fg-dim">
          by
          <MakeItMark className="h-[0.7em]" />
          <span className="font-medium text-fg">{COMPANY.name}</span>
        </span>
      </div>
    );
  }
  return (
    <div
      className={cn("flex items-center gap-2 select-none", className)}
      aria-label={COMPANY.product}
    >
      <MakeItMark className="h-[0.78em]" />
      <span className="font-display text-copy tracking-[-0.02em]">
        {COMPANY.name}
        <span className="mx-1.5 text-fg-faint" aria-hidden>{"//"}</span>
        HQ
      </span>
    </div>
  );
}
