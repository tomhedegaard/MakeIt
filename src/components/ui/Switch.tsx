"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * The one on/off switch (DESIGN.md). Square (radius 0), 48 × 28 with a
 * 44 px hit area. Off: paper track, dim knob. On: ink track, paper knob.
 *
 * `pending` keeps the switch focusable (aria-disabled, not disabled): a
 * disabled control drops keyboard focus to <body> while a save runs.
 */
const Switch = forwardRef<
  HTMLButtonElement,
  {
    checked: boolean;
    onCheckedChange: (next: boolean) => void;
    /** Accessible name; or point at visible text with labelledBy. */
    label?: string;
    labelledBy?: string;
    pending?: boolean;
    disabled?: boolean;
    className?: string;
  }
>(function Switch({ checked, onCheckedChange, label, labelledBy, pending = false, disabled = false, className }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      aria-disabled={pending || undefined}
      disabled={disabled}
      onClick={() => {
        if (!pending && !disabled) onCheckedChange(!checked);
      }}
      className={cn(
        "relative inline-flex h-11 w-12 shrink-0 items-center touch-app disabled:opacity-40 disabled:cursor-not-allowed",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "relative block h-7 w-12 border transition-colors duration-200 ease-out motion-reduce:transition-none",
          checked ? "bg-fg border-fg" : "bg-bg border-line-strong",
        )}
      >
        <span
          className={cn(
            "absolute left-0 top-0.5 size-[22px] transition-transform duration-200 ease-out motion-reduce:transition-none",
            checked ? "translate-x-[23px] bg-bg" : "translate-x-[2px] bg-fg-dim",
          )}
        />
      </span>
    </button>
  );
});

export default Switch;
