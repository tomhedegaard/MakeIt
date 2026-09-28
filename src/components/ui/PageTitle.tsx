import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One title scale for every app page (Nord, spec §4): 34 px sidetitel på
 * telefon. "page" vokser til 44 px fra md, "compact" (undersider) bliver
 * på 34 px, så hierarkiet mellem en fane og dens underside holder på
 * store skærme uden at opfinde en ny størrelse på telefonen.
 */
export default function PageTitle({
  title,
  kicker,
  size = "page",
  action,
  className,
}: {
  title: string;
  kicker?: string;
  size?: "page" | "compact";
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div data-size={size} className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0 flex-1 basis-48">
        {kicker ? <p className="eyebrow eyebrow-domain mb-2">{kicker}</p> : null}
        <h1
          className={cn(
            "font-display text-title",
            size === "page" && "md:text-[2.75rem]",
          )}
        >
          {title}
        </h1>
      </div>
      {/* shrink-0 keeps a small action (streak badge) beside the title;
          max-w-full stops a wide one (the Kost action row) from spilling
          past the viewport once it has wrapped onto its own line. */}
      {action ? <div className="shrink-0 max-w-full">{action}</div> : null}
    </div>
  );
}
