import { createElement, type ElementType, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Domain = "body" | "food" | "heart" | "mind";

/**
 * The one card (spec 2026-09-17 §6). quiet = grouped content,
 * primary = the single most important thing on a screen (max one).
 */
export default function Card({
  variant = "quiet",
  domain,
  as: Tag = "div",
  className,
  children,
  ...rest
}: {
  variant?: "quiet" | "primary";
  domain?: Domain;
  as?: ElementType;
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "className" | "children">) {
  // JSX resolves props for a generic `ElementType` across every possible
  // tag/component overload, which collapses `children` to `never` (or
  // matches an unrelated element like SVGSymbolElement). createElement
  // sidesteps that JSX-specific overload resolution.
  return createElement(
    Tag,
    {
      ...rest,
      "data-card": variant,
      "data-domain": domain,
      className: cn(
        "bg-bg-2 rounded-[14px] p-5 border",
        variant === "primary" ? "border-line-strong" : "border-line",
        className,
      ),
    },
    children,
  );
}
