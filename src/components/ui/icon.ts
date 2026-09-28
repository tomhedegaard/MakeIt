/**
 * The one icon language (Nord, spec §5 and §11): line icons from
 * lucide-react at 24 px, 1.5 px stroke, square caps, mitred joins,
 * monochrome via currentColor. Spread ICON on every lucide icon so the
 * library's round-cap, 2 px default never shows up.
 */
export const ICON = {
  strokeWidth: 1.5,
  strokeLinecap: "square",
  strokeLinejoin: "miter",
  "aria-hidden": true,
} as const;
