import { cn } from "@/lib/utils";

export default function Container({
  className,
  children,
  size = "default",
}: {
  className?: string;
  children: React.ReactNode;
  size?: "default" | "wide" | "narrow";
}) {
  const max =
    size === "wide" ? "max-w-[1480px]" : size === "narrow" ? "max-w-3xl" : "max-w-[1280px]";
  return (
    // 20 px sidemargin på telefon (spec §5), mere luft fra md og op.
    <div className={cn("mx-auto w-full px-5 md:px-10", max, className)}>
      {children}
    </div>
  );
}
