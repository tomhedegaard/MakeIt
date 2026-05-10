/**
 * Brand-A glyph — the "A" letterform from the MakeIt logo.
 *
 * Used as a stylistic substitute inside H1 headings to reinforce
 * brand identity. Inherits color from the surrounding text via
 * fill="currentColor" and scales to height matched to the parent
 * font's cap-height (set via the `className` prop, e.g. h-[0.85em]).
 *
 * Source: 30312660-A_only.ai → SVG via pdftocairo. The viewBox is
 * cropped to the actual glyph bounds with a small safety margin.
 */
export default function BrandA({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="50 40 485 405"
      className={className}
      fill="currentColor"
      fillRule="evenodd"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      style={{ display: "inline-block", verticalAlign: "baseline" }}
    >
      {title ? <title>{title}</title> : null}
      <path d="M 293.722656 197.417969 L 146.34375 443.710938 L 210.667969 443.710938 L 293.820312 304.738281 L 295.742188 304.738281 L 379.007812 443.710938 L 443.210938 443.710938 L 295.640625 197.417969 Z" />
      <path d="M 499.359375 386.800781 L 499.429688 386.800781 L 419.960938 254.175781 L 419.929688 254.175781 L 294.605469 45.019531 L 292.695312 45.019531 L 145.304688 291.300781 L 145.496094 291.300781 L 133.886719 310.707031 L 133.878906 310.707031 L 54.367188 443.582031 L 118.691406 443.582031 L 161.074219 372.761719 L 161.082031 372.761719 L 240.523438 240.003906 L 240.332031 240.003906 L 292.796875 152.339844 L 294.714844 152.339844 L 377.980469 291.300781 L 378.011719 291.300781 L 389.519531 310.523438 L 389.449219 310.523438 L 468.988281 443.261719 L 533.195312 443.261719 Z" />
    </svg>
  );
}
