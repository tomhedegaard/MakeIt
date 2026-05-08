import { cn } from "@/lib/utils";

/**
 * Stylized uppercase "A" — two filled triangles flanking an inner
 * triangular counter, sharp miters in the same geometric language as
 * the MakeIt mark. Sized in em so it tracks the parent font-size.
 */
export function DisplayA({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      className={cn("inline-block", className)}
      style={{
        height: "0.72em",
        width: "0.78em",
        verticalAlign: "baseline",
        marginRight: "0.01em",
      }}
    >
      <path
        d="M2 30 L16 2 L30 30 Z M10 25 L16 13 L22 25 Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

/**
 * Wraps a headline string and replaces every uppercase "A" with the
 * triangle-A glyph. The original text is preserved on the wrapper via
 * aria-label so screen readers and copy-paste still see "A".
 */
export function Display({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
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
