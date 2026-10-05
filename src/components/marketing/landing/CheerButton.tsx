"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * "Hep" on a sample crew card: press it and the count goes up by one,
 * press again to take it back. Local only, nothing is sent.
 */
export default function CheerButton({
  count,
  label,
  cheer,
  cheered,
}: {
  count: number;
  /** Accessible name, e.g. "Hep på Sara K.". */
  label: string;
  cheer: string;
  cheered: string;
}) {
  const [on, setOn] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={() => setOn((v) => !v)}
      className={cn(
        "group/cheer inline-flex shrink-0 cursor-pointer items-center gap-2 border px-3 py-1.5 text-[13px] transition-colors duration-200 motion-reduce:transition-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
        on ? "border-fg bg-fg text-bg" : "border-line-strong bg-bg hover:border-fg",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block transition-transform duration-300 ease-out motion-reduce:transition-none",
          on ? "scale-125" : "group-hover/cheer:-translate-y-0.5",
        )}
      >
        ↑
      </span>
      <span>{on ? cheered : cheer}</span>
      <span key={on ? "on" : "off"} className="numeric spot-count">
        {count + (on ? 1 : 0)}
      </span>
    </button>
  );
}
