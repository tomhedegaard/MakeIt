import type { HTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** One empty state for every list/section: an icon, one sentence, one action. */
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
        "bg-bg-2 rounded-[14px] border border-line p-5 flex flex-col items-center gap-3 text-center",
        className,
      )}
    >
      {icon ? (
        <span aria-hidden className="text-fg-dim">
          {icon}
        </span>
      ) : null}
      <h2 className="font-display text-xl">{title}</h2>
      <p className="text-fg-dim text-sm">{body}</p>
      <Link href={actionHref} className="btn btn-primary">
        {actionLabel}
      </Link>
    </div>
  );
}
