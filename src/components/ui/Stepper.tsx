"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  commitStepperInput,
  formatStepperNumber,
} from "@/components/ui/stepper-value";

export default function Stepper({
  value,
  onChange,
  step = 2.5,
  min = 0,
  max = 999,
  unit = "kg",
  name,
  label,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  name?: string;
  label?: string;
  className?: string;
}) {
  const t = useTranslations("Session.steppers");
  const inputId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const allowDecimal = !Number.isInteger(step);
  const fieldName = name ?? (unit === "kg" ? "weight" : unit);
  const fieldLabel = label ?? unit;

  const commit = (next: number) => {
    setDraft(null);
    onChange(next);
  };

  const dec = () => commit(Math.max(min, +(value - step).toFixed(2)));
  const inc = () => commit(Math.min(max, +(value + step).toFixed(2)));

  const applyRaw = (raw: string) => {
    const next = commitStepperInput(raw, min, max, step);
    if (next !== null && next !== value) onChange(next);
  };

  return (
    <div className={cn("stepper touch-app", className)}>
      <button
        type="button"
        aria-label={t("decrease", { label: fieldLabel })}
        className="stepper-btn"
        onClick={dec}
        disabled={value <= min}
      >
        –
      </button>
      <div className="stepper-value">
        <div className="stepper-num">
          <input
            id={inputId}
            name={fieldName}
            data-stepper-input={fieldName}
            type="text"
            inputMode={allowDecimal ? "decimal" : "numeric"}
            enterKeyHint="done"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            pattern={allowDecimal ? "[0-9]*[.,]?[0-9]*" : "[0-9]*"}
            className="stepper-input"
            value={draft ?? formatStepperNumber(value)}
            aria-label={fieldLabel}
            onChange={(event) => {
              const raw = event.target.value;
              setDraft(raw);
              applyRaw(raw);
            }}
            onBlur={() => {
              if (draft !== null) applyRaw(draft);
              setDraft(null);
            }}
            onFocus={(event) => {
              setDraft(formatStepperNumber(value));
              event.currentTarget.select();
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              event.currentTarget.blur();
            }}
          />
          <span className="stepper-label-unit ml-1 text-fg-dim text-base">
            {unit}
          </span>
        </div>
        {label ? (
          <label htmlFor={inputId} className="stepper-label">
            {label}
          </label>
        ) : null}
      </div>
      <button
        type="button"
        aria-label={t("increase", { label: fieldLabel })}
        className="stepper-btn"
        onClick={inc}
        disabled={value >= max}
      >
        +
      </button>
    </div>
  );
}
