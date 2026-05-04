import { cn } from "@/lib/utils";

export default function Marquee({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  const doubled = [...items, ...items];
  return (
    <div className={cn("overflow-hidden border-y hairline py-6 select-none", className)}>
      <div className="marquee-track flex w-max items-center gap-12 whitespace-nowrap">
        {doubled.map((it, i) => (
          <span key={i} className="font-display text-[clamp(2rem,4vw,4rem)] text-fg-dim">
            {it}
            <span className="mx-12 text-fg-faint">/</span>
          </span>
        ))}
      </div>
    </div>
  );
}
