"use client";

import { useState } from "react";

/**
 * Tap target over a plate photo (ChapterFood). Touch has no hover, so a
 * tap opens the plate's macro bars: it sets `data-open` on the closest
 * card, which the overlay's `group-data-[open=true]` classes read. A
 * second tap closes it. The mouse still gets the bars on hover.
 */
export default function PlateToggle({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={open}
      onClick={(e) => {
        const card = e.currentTarget.closest<HTMLElement>("li");
        const next = !open;
        if (card) card.dataset.open = String(next);
        setOpen(next);
      }}
      className="absolute inset-0 z-[1] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-fg"
    />
  );
}
