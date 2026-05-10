import React from "react";
import BrandA from "./BrandA";

/**
 * Heading wrapper that swaps every "A" / "a" in its text content
 * with the brand-A SVG glyph. Non-string children (e.g. <br />,
 * <span>, fragments) pass through untouched, and string segments
 * are walked character-by-character.
 *
 * Accessibility: the rendered DOM has aria-hidden parts for the
 * visual letterforms and an aria-label on the heading containing
 * the original text, so screen readers still announce the full
 * headline correctly.
 *
 * The SVG is sized at 0.78em — a touch shorter than cap-height —
 * with a small negative margin to nudge the baseline down so it
 * sits visually centered against the surrounding letters.
 *
 * Usage:
 *   <BrandHeading className="font-display text-5xl">
 *     Velkommen<br /> til crewet.
 *   </BrandHeading>
 *
 *   // Or as a different element:
 *   <BrandHeading as="h2" className="font-display text-3xl">
 *     Hvad sigter du efter?
 *   </BrandHeading>
 */
export default function BrandHeading({
  as: Tag = "h1",
  children,
  className,
  glyphClassName,
}: {
  as?: "h1" | "h2" | "h3";
  children: React.ReactNode;
  className?: string;
  glyphClassName?: string;
}) {
  const plainText = extractText(children);

  return (
    <Tag className={className} aria-label={plainText || undefined}>
      {transform(children, glyphClassName)}
    </Tag>
  );
}

const DEFAULT_GLYPH = "h-[0.78em] w-auto -translate-y-[0.04em]";

function transform(
  node: React.ReactNode,
  glyphClassName: string | undefined,
  keyPrefix = "",
): React.ReactNode {
  if (typeof node === "string") {
    return splitString(node, glyphClassName, keyPrefix);
  }
  if (Array.isArray(node)) {
    return node.map((child, i) => (
      <React.Fragment key={`${keyPrefix}${i}`}>
        {transform(child, glyphClassName, `${keyPrefix}${i}.`)}
      </React.Fragment>
    ));
  }
  // React element, fragment, number, boolean, null — leave untouched.
  return node;
}

function splitString(
  str: string,
  glyphClassName: string | undefined,
  keyPrefix: string,
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let buf = "";
  let aIdx = 0;

  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === "A" || c === "a") {
      if (buf) {
        out.push(
          <span key={`${keyPrefix}t${i}`} aria-hidden="true">
            {buf}
          </span>
        );
        buf = "";
      }
      out.push(
        <BrandA
          key={`${keyPrefix}a${aIdx++}`}
          className={glyphClassName ?? DEFAULT_GLYPH}
        />
      );
    } else {
      buf += c;
    }
  }
  if (buf) {
    out.push(
      <span key={`${keyPrefix}t-end`} aria-hidden="true">
        {buf}
      </span>
    );
  }
  return out;
}

/** Walk children, concat all string content into a single string for aria-label. */
function extractText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join("");
  }
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    if (typeof props.children !== "undefined") {
      return extractText(props.children);
    }
    // <br /> contributes a space so aria-label reads naturally.
    if (typeof node.type === "string" && node.type === "br") {
      return " ";
    }
  }
  return "";
}
