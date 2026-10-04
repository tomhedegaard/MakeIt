import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Fortællebånd (spec §5): a blæk block inside a light screen for the
 * story behind the numbers ("Sådan læste HQ natten", "Et menneske skriver
 * under"). White title 22, body 15 in --fg-body, 24 px padding, no radius.
 *
 * A plain data-theme="nat" wrapper (not .theme-root) gives the block Nat's
 * tokens without turning the page dark (ThemeScope docs).
 */
export default function NarrativeBand({
  kicker,
  title,
  children,
  action,
  headingLevel = 2,
  className,
}: {
  kicker?: string;
  title: string;
  children?: ReactNode;
  /** A link or button; rendered under the body. */
  action?: ReactNode;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section data-theme="nat" data-narrative-band className={cn("bg-bg text-fg p-6", className)}>
      {kicker ? <p className="text-meta text-fg-dim mb-2">{kicker}</p> : null}
      <Heading className="font-display text-section">{title}</Heading>
      {children ? <div className="mt-3 text-copy text-fg-body max-w-prose">{children}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
