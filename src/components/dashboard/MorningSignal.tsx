import Link from "next/link";
import { useTranslations } from "next-intl";

import {
  buildMorningSignal,
  type MorningSignalCell,
  type MorningSignalInput,
} from "@/lib/dashboard/morning-signal";

/**
 * C5: four facts across body, heart, mind and food. Domain colour only
 * on the kicker; values stay monochrome (no status colours).
 */
export default function MorningSignal({ input }: { input: MorningSignalInput }) {
  const t = useTranslations("Dashboard.morningSignal");
  const tHrv = useTranslations("Dashboard.hrvChip");
  const cells = buildMorningSignal(input);

  function unitLabel(cell: MorningSignalCell): string {
    return cell.unit === "ms" ? tHrv("unit") : t("kcal");
  }

  function sentence(cell: MorningSignalCell): string {
    const label = t(`labels.${cell.labelKey}`);
    const status = t(`values.${cell.valueKey}`);
    if (cell.value === undefined) return t("sr.status", { label, status });
    if (cell.of !== undefined) {
      return t("sr.valueOf", { label, value: cell.value, of: cell.of, unit: unitLabel(cell), status });
    }
    return t("sr.value", { label, value: cell.value, unit: unitLabel(cell), status });
  }

  return (
    <section aria-label={t("label")}>
      <ul className="grid grid-cols-2 min-[360px]:grid-cols-4 gap-2">
        {cells.map((cell) => (
          <li key={cell.domain} className="min-w-0">
            <Link
              href={cell.href}
              data-domain={cell.domain}
              className="relative flex h-full min-w-0 flex-col gap-1 rounded-xl border hairline bg-bg-2 p-3 lift touch-app"
            >
              <span className="sr-only">{sentence(cell)}</span>
              <span aria-hidden className="flex min-w-0 flex-col gap-1">
                <span className="eyebrow eyebrow-domain">{t(`labels.${cell.labelKey}`)}</span>
                {cell.value !== undefined ? (
                  <span className="min-w-0 break-words">
                    <span className="font-mono tabular-nums text-xl text-fg">{cell.value}</span>
                    {cell.of !== undefined ? (
                      <span className="font-mono tabular-nums text-xs text-fg-dim">/{cell.of}</span>
                    ) : null}
                    <span className="ml-1 text-xs text-fg-dim">{unitLabel(cell)}</span>
                  </span>
                ) : null}
                <span className="text-xs text-fg-dim break-words">{t(`values.${cell.valueKey}`)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
