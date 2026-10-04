import Link from "next/link";

/**
 * A filter choice that is a link, so the filter state lives in the URL.
 * The active one is filled, the rest outlined; 44 px tall for touch.
 */
export default function FilterPill({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex min-h-11 items-center px-4 text-micro border hairline transition-colors ${
        active ? "bg-fg text-bg border-transparent" : "text-fg-dim hover:text-fg hover:border-fg/30"
      }`}
    >
      {label}
    </Link>
  );
}
