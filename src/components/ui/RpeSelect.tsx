"use client";

import { cn } from "@/lib/utils";

const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10] as const;

export default function RpeSelect({
  value,
  onChange,
  className,
}: {
  value: number | null;
  onChange: (v: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("pillgroup", className)} role="radiogroup" aria-label="RPE">
      {RPE_VALUES.map((rpe) => (
        <button
          key={rpe}
          type="button"
          role="radio"
          aria-checked={value === rpe}
          data-active={value === rpe}
          className="pill touch-app"
          onClick={() => onChange(rpe)}
        >
          {rpe % 1 === 0 ? rpe : rpe.toFixed(1)}
        </button>
      ))}
    </div>
  );
}
