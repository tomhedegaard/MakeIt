import { cn } from "@/lib/utils";

export default function Logo({
  className,
  variant = "full",
}: {
  className?: string;
  variant?: "full" | "mark";
}) {
  if (variant === "mark") {
    return (
      <svg viewBox="0 0 32 32" className={cn("h-6 w-6", className)} aria-hidden>
        <rect x="1" y="1" width="30" height="30" rx="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M8 22 V10 L13 18 L18 10 V22" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinejoin="miter" />
        <rect x="21" y="14" width="3" height="8" fill="currentColor" />
      </svg>
    );
  }
  return (
    <div
      className={cn("flex items-center gap-2.5 select-none", className)}
      aria-label="MakeIt // HQ"
    >
      <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden>
        <rect x="1" y="1" width="30" height="30" rx="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M8 22 V10 L13 18 L18 10 V22" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinejoin="miter" />
        <rect x="21" y="14" width="3" height="8" fill="currentColor" />
      </svg>
      <span className="font-display text-[0.95rem] tracking-[-0.02em] leading-none">
        MAKEIT
        <span className="mx-1.5 text-fg-faint" aria-hidden>//</span>
        HQ
      </span>
    </div>
  );
}
