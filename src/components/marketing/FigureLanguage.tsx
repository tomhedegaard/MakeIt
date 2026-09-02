import DomainMark, { DOMAINS, type Domain } from "@/components/brand/DomainMark";
import MakeItFigure from "@/components/brand/MakeItFigure";
import { cn } from "@/lib/utils";

/**
 * Shared figure + DomainMark language for public marketing surfaces.
 * Same silhouette and marks as the dashboard BodyMap — no second
 * icon set. Teaching state: all four anchors lit. Dosage stays in
 * the marks and anchors, never in body copy.
 * See docs/MAKEIT_FIGURE.md.
 */

export const HERO_DOMAINS = ["body", "food", "heart", "mind"] as const;

/** Teaching state lights all four. A selection lights only that domain. */
export function highlightsForActive(
  active: Domain | null,
): readonly Domain[] {
  return active ? [active] : DOMAINS;
}

export function MarketingDomainKicker({
  domain,
  label,
  className,
  markClassName = "size-3.5",
}: {
  domain: Domain;
  label: string;
  className?: string;
  markClassName?: string;
}) {
  return (
    <span data-domain={domain} className={cn("inline-flex", className)}>
      <span className="eyebrow eyebrow-domain flex items-center gap-2">
        <DomainMark
          domain={domain}
          className={cn(markClassName, "text-domain shrink-0")}
        />
        {label}
      </span>
    </span>
  );
}

export function MarketingFigure({
  ariaLabel,
  className,
}: {
  ariaLabel: string;
  className?: string;
}) {
  return (
    <MakeItFigure
      highlightedDomains={DOMAINS}
      ariaLabel={ariaLabel}
      className={className}
    />
  );
}
