import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type FieldType = NonNullable<InputHTMLAttributes<HTMLInputElement>["type"]>;

const AUTOCOMPLETE_BY_TYPE: Partial<Record<FieldType, string>> = {
  email: "email",
  tel: "tel",
};

const INPUT_MODE_BY_TYPE: Partial<Record<FieldType, InputHTMLAttributes<HTMLInputElement>["inputMode"]>> = {
  email: "email",
  tel: "tel",
  number: "decimal",
};

function DangerGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 8v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="16.2" r="0.9" fill="currentColor" />
    </svg>
  );
}

/** Label above, hint and error below — never the placeholder as label. */
export default function Field({
  id,
  name,
  label,
  type = "text",
  hint,
  error,
  autoComplete,
  inputMode,
  className,
  ...rest
}: {
  id: string;
  name: string;
  label: string;
  type?: FieldType;
  hint?: string;
  error?: string;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name" | "type" | "className">) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <input
        {...rest}
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete ?? AUTOCOMPLETE_BY_TYPE[type]}
        inputMode={inputMode ?? INPUT_MODE_BY_TYPE[type]}
        aria-describedby={describedBy}
        aria-invalid={error ? "true" : undefined}
        className={cn("field", className)}
      />
      {hint ? (
        <p id={hintId} className="text-fg-dim text-xs">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="flex items-center gap-1.5 text-danger text-xs">
          <DangerGlyph />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
