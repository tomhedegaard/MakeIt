import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { CircleAlert } from "lucide-react";
import { ICON } from "@/components/ui/icon";

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
    <CircleAlert {...ICON} className="size-3.5 shrink-0" />
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
        <p id={hintId} className="text-fg-dim text-meta">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="flex items-center gap-1.5 text-danger text-meta">
          <DangerGlyph />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
