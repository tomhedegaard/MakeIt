import { getTranslations } from "next-intl/server";

import type { TodayProseKey, TodayProseModel } from "@/lib/dashboard/today-prose";

/**
 * Short proactive coach line at the top of Today / 01.
 * Body text stays --fg-dim. Domain stroke is direction only.
 * A warn/ok lead gets a dot in the lead domain's ink (fg without one):
 * status colours belong to filled alerts only (spec §3.3). No CTA.
 */
export default async function TodayProse({ model }: { model: TodayProseModel }) {
  const t = await getTranslations("Dashboard.todayProse");
  const dot = model.leadTone === "warn" || model.leadTone === "ok";

  return (
    <section
      data-today-prose=""
      data-today-prose-keys={model.lines.map((line) => line.key).join(" ")}
      aria-label={t("ariaLabel")}
      className="max-w-2xl"
    >
      <div className="flex items-center gap-2 mb-2">
        {dot ? (
          <span
            data-domain={model.leadDomain ?? undefined}
            className="size-2 rounded-full shrink-0"
            style={{ background: "var(--domain, var(--fg))" }}
            aria-hidden
          />
        ) : null}
        <div className="eyebrow">{t("eyebrow")}</div>
      </div>
      {model.leadDomain ? (
        <span
          data-domain={model.leadDomain}
          className="domain-stroke mb-3"
          aria-hidden
        />
      ) : null}
      <p className="text-fg-dim text-base md:text-lg leading-relaxed">
        {model.lines.map((line, i) => (
          <span key={line.key} data-today-prose-key={line.key}>
            {i > 0 ? " " : null}
            {t(line.key as TodayProseKey, line.params ?? {})}
          </span>
        ))}
      </p>
    </section>
  );
}
