import type { HTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** One empty state for every list/section: an icon, one sentence, one action. Venstrestillet som alt andet i Nord (spec §5). */
export default function EmptyState({
  icon,
  title,
  body,
  actionHref,
  actionLabel,
  className,
  ...rest
}: {
  icon?: ReactNode;
  title: string;
  body: string;
  actionHref: string;
  actionLabel: string;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "className">) {
  return (
    <div
      {...rest}
      data-empty-state
      className={cn(
        "bg-bg-2 border border-line p-5 flex flex-col items-start gap-3",
        className,
      )}
    >
      {icon ? (
        <span aria-hidden className="text-fg-dim">
          {icon}
        </span>
      ) : null}
      <h2 className="font-display text-section">{title}</h2>
      <p className="text-copy text-fg-body">{body}</p>
      <Link href={actionHref} className="btn btn-primary">
        {actionLabel}
      </Link>
    </div>
  );
}
