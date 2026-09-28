import { getTranslations } from "next-intl/server";

import type { TodayProseKey, TodayProseModel } from "@/lib/dashboard/today-prose";

const TONE_DOT: Record<TodayProseModel["leadTone"], string | null> = {
  warn: "var(--warn)",
  ok: "var(--ok)",
  quiet: null,
  neutral: null,
};

/**
 * Short proactive coach line at the top of Today / 01.
 * Body text stays --fg-dim. Domain stroke is direction only.
 * Status via --ok/--warn. No CTA.
 */
export default async function TodayProse({ model }: { model: TodayProseModel }) {
  const t = await getTranslations("Dashboard.todayProse");
  const dot = TONE_DOT[model.leadTone];

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
            className="size-2 rounded-full shrink-0"
            style={{ background: dot }}
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
