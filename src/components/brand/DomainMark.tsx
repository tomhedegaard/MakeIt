import { Brain, Dumbbell, HeartPulse, Utensils, type LucideIcon } from "lucide-react";
import { ICON } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * One mark per health domain, and the SAME mark everywhere the domain
 * appears: tab bar, kickers, the HQ reason strip, the dashboard stream
 * (Nord, spec §11). Line icons in the one icon language — not the old
 * anatomical organ glyphs, which read as illustrations beside the rest
 * of the UI.
 *
 *   body  (Krop, 02 Træn)  → dumbbell
 *   food  (Mad, 03)        → knife and fork
 *   heart (Hjerte, 05 HRV) → heart with a pulse line
 *   mind  (Sind, 06 Mind)  → brain
 *
 * Colour comes from the caller (`text-domain` inside a data-domain
 * scope); the mark itself is currentColor.
 */
export const DOMAINS = ["mind", "heart", "body", "food"] as const;
export type Domain = (typeof DOMAINS)[number];

export const DOMAIN_ICON: Record<Domain, LucideIcon> = {
  body: Dumbbell,
  food: Utensils,
  heart: HeartPulse,
  mind: Brain,
};

export default function DomainMark({ domain, className }: { domain: Domain; className?: string }) {
  const Glyph = DOMAIN_ICON[domain];
  return (
    <Glyph
      {...ICON}
      data-domain={domain}
      className={cn("domain-mark size-6 shrink-0", `domain-mark--${domain}`, className)}
    />
  );
}
