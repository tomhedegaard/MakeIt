import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Nord's type scale (globals.css --text-*). Without this, twMerge reads
// text-micro as a colour and drops it next to text-fg-dim.
const twMerge = extendTailwindMerge({
  extend: {
    theme: { text: ["micro", "meta", "copy", "card", "section", "title", "hero", "hero-lg"] },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number, locale = "da-DK") {
  return new Intl.NumberFormat(locale).format(n);
}
