import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared building blocks for the marketing phone screens, translated
 * from reference B's app classes (`.a-eye`, `.a-h`, `.card`, `.k`,
 * `.chip`, `.fields`, `.a-btn`, `.motor`) and reference A's rows
 * (`.a-row`, `.a-diff`). Tokens only, no state.
 */

export type Domain = "body" | "food" | "heart" | "mind";

/** Screen kicker. Takes the domain colour when a domain is given. */
export function Kicker({
  domain,
  dot = false,
  className,
  children,
}: {
  domain?: Domain;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      data-domain={domain}
      className={cn(
        "flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em]",
        domain ? "text-domain" : "text-fg-dim",
        className,
      )}
    >
      {dot ? <Dot /> : null}
      {children}
    </p>
  );
}

export function Dot({ domain, className }: { domain?: Domain; className?: string }) {
  return (
    <i
      data-domain={domain}
      className={cn("inline-block size-1.5 flex-none rounded-full bg-domain", className)}
    />
  );
}

/** Display headline (`.a-h`). */
export function Headline({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn("font-display text-[26px]", className)}>{children}</p>;
}

/** Mono micro label (`.k`). */
export function Label({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <p
      className={cn(
        "flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-fg-dim",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-[14px] border border-line bg-bg-2 px-3 py-[11px]", className)}>
      {children}
    </div>
  );
}

export function Chip({
  domain,
  className,
  children,
}: {
  domain?: Domain;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      data-domain={domain}
      className={cn(
        "inline-flex items-center gap-[5px] whitespace-nowrap rounded-full border border-line bg-bg-2 px-2 py-1 font-mono text-[9px] tracking-[0.04em]",
        className,
      )}
    >
      {domain ? <Dot /> : null}
      {children}
    </span>
  );
}

/** Three small value fields (`.fields`). */
export function Fields({
  items,
  className,
}: {
  items: readonly { label: string; value: string }[];
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-3 gap-1.5", className)}>
      {items.map((f) => (
        <div key={f.label} className="rounded-[10px] border border-line px-[7px] py-[5px]">
          <span className="block font-mono text-[7.5px] uppercase tracking-[0.08em] text-fg-dim">
            {f.label}
          </span>
          <b className="block font-mono text-[13px] font-medium">{f.value}</b>
        </div>
      ))}
    </div>
  );
}

/** Pill button in ink (`.a-btn`). Buttons are monochrome, never orange. */
export function Pill({
  ghost = false,
  className,
  children,
}: {
  ghost?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "flex h-[34px] flex-none items-center justify-center rounded-full font-mono text-[10px] font-medium uppercase tracking-[0.1em]",
        ghost ? "border border-line-strong text-fg" : "bg-fg text-bg",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** The engine's ink note (`.motor`). */
export function EngineNote({
  stamp,
  className,
  children,
}: {
  stamp: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-[14px] bg-fg px-3 py-2.5 text-bg", className)}>
      <p className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-bg/65">{stamp}</p>
      {children}
    </div>
  );
}

/** Before and after, with the old value struck in signal orange. */
export function Swap({
  from,
  to,
  unit,
  className,
}: {
  from: string;
  to: string;
  unit?: string;
  className?: string;
}) {
  return (
    <p className={cn("flex items-baseline gap-2 font-display text-[24px]", className)}>
      <s className="text-current/55 decoration-signal decoration-[3px]">{from}</s>
      <span>→ {to}</span>
      {unit ? <i className="font-mono text-[11px] normal-case not-italic opacity-65">{unit}</i> : null}
    </p>
  );
}

/** Key and value on one hairline row (reference A `.a-row`). */
export function Row({
  k,
  v,
  last = false,
  className,
}: {
  k: ReactNode;
  v: ReactNode;
  last?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-2 border-t border-line py-[5px]",
        last && "border-b",
        className,
      )}
    >
      <span className="text-[10px] text-fg-dim">{k}</span>
      <span className="font-mono text-[10px] font-medium">{v}</span>
    </div>
  );
}

/** Initials avatar (`.av`). */
export function Avatar({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "grid size-[26px] flex-none place-items-center rounded-full bg-fg font-display text-[11px] text-bg",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Chevron() {
  return (
    <svg viewBox="0 0 10 10" className="size-2.5 flex-none" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 1.5L7 5 3.5 8.5" />
    </svg>
  );
}
