import { cn } from "@/lib/utils";

/**
 * Initials in a 1 px ring. Decorative: the handle next to it carries
 * the name, so screen readers skip the letters.
 */
export default function Avatar({ handle, className }: { handle: string; className?: string }) {
  const initials = handle.replace(/^@/, "").slice(0, 2).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-full border hairline-strong bg-bg text-micro text-fg", className)}
    >
      {initials}
    </span>
  );
}
