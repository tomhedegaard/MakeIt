"use client";

import { cn } from "@/lib/utils";

export default function Stepper({
  value,
  onChange,
  step = 2.5,
  min = 0,
  max = 999,
  unit = "kg",
  label,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  label?: string;
  className?: string;
}) {
  const dec = () => onChange(Math.max(min, +(value - step).toFixed(2)));
  const inc = () => onChange(Math.min(max, +(value + step).toFixed(2)));

  return (
    <div className={cn("stepper touch-app", className)}>
      <button
        type="button"
        aria-label={`Mindre ${label ?? unit}`}
        className="stepper-btn"
        onClick={dec}
        disabled={value <= min}
      >
        –
      </button>
      <div className="stepper-value">
        <div className="stepper-num">
          {value}
          <span className="stepper-label-unit ml-1 text-fg-dim text-base">{unit}</span>
        </div>
        {label ? <div className="stepper-label">{label}</div> : null}
      </div>
      <button
        type="button"
        aria-label={`Mere ${label ?? unit}`}
        className="stepper-btn"
        onClick={inc}
        disabled={value >= max}
      >
        +
      </button>
    </div>
  );
}
