import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One title scale for every app page (replaces 8 ad-hoc clamp sizes). */
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
            "font-display",
            size === "page" ? "text-[clamp(2.25rem,8vw,3.5rem)]" : "text-[clamp(1.75rem,6vw,2.5rem)]",
          )}
        >
          {title}
        </h1>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
