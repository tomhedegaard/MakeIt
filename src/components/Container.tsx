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
    <div className={cn("mx-auto w-full px-6 md:px-10", max, className)}>
      {children}
    </div>
  );
}
