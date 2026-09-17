import Link from "next/link";
import { cn } from "@/lib/utils";

export default function SectionHeader({
  eyebrow,
  title,
  href,
  linkLabel,
  id,
  className,
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  linkLabel?: string;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow eyebrow-domain mb-2">{eyebrow}</p> : null}
        <h2 id={id} className="font-display text-2xl">{title}</h2>
      </div>
      {href && linkLabel ? (
        <Link href={href} className="shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-dim hover:text-fg">
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}
