import { cn } from "@/lib/utils";

/**
 * Stylized uppercase "A" — two filled triangles meeting at the apex
 * with a visible base-gap between them, in the same geometric language
 * as the MakeIt mark. Sized in em so it tracks the parent font-size.
 */
export function DisplayA({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 32"
      aria-hidden
      className={cn("inline-block", className)}
      style={{
        height: "0.78em",
        width: "0.92em",
        verticalAlign: "baseline",
        marginRight: "0.01em",
      }}
    >
      {/* Left triangle: bottom-left → apex → split-base */}
      <path d="M2 31 L20 1 L17 31 Z" fill="currentColor" />
      {/* Right triangle: apex → bottom-right → split-base */}
      <path d="M20 1 L38 31 L23 31 Z" fill="currentColor" />
    </svg>
  );
}

/**
 * Wraps a headline string and replaces every uppercase "A" with the
 * triangle-A glyph. Strings without an "A" are returned untouched so
 * they don't pick up extra DOM nesting that would shift line-height.
 */
export function Display({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  if (!children.includes("A")) {
    return className ? <span className={className}>{children}</span> : <>{children}</>;
  }
  const parts = children.split("A");
  return (
    <span aria-label={children} className={className}>
      {parts.map((part, i) => (
        <span key={i}>
          <span aria-hidden>{part}</span>
          {i < parts.length - 1 && <DisplayA />}
        </span>
      ))}
    </span>
  );
}
