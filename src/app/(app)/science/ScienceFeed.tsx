"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { intlLocaleTag } from "@/i18n/config";
import { DOMAIN_COLOR, DOMAIN_ORDER } from "@/lib/science/domains";
import type { DomainKey } from "@/lib/science/config";
import type { ScienceFeedItem } from "@/lib/data/science";

type DomainFilter = DomainKey | "all";

export default function ScienceFeed({ items }: { items: ScienceFeedItem[] }) {
  const t = useTranslations("Science");
  const [domain, setDomain] = useState<DomainFilter>("all");
  const [evidence, setEvidence] = useState<string>("all");

  // Distinct evidence badges present in the data — for the evidence filter.
  const badges = useMemo(
    () => [...new Set(items.map((i) => i.evidenceBadge))].sort(),
    [items],
  );

  const visible = items.filter(
    (i) => (domain === "all" || i.domain === domain) && (evidence === "all" || i.evidenceBadge === evidence),
  );

  return (
    <div className="mt-8">
      {/* Domain filter */}
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("filters.domainLabel")}>
        <FilterChip active={domain === "all"} onClick={() => setDomain("all")}>
          {t("filters.all")}
        </FilterChip>
        {DOMAIN_ORDER.map((key) => (
          <FilterChip
            key={key}
            active={domain === key}
            color={DOMAIN_COLOR[key]}
            onClick={() => setDomain(key)}
          >
            {t(`domains.${key}`)}
          </FilterChip>
        ))}
      </div>

      {/* Evidence filter */}
      {badges.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t("filters.evidenceLabel")}>
          <FilterChip active={evidence === "all"} onClick={() => setEvidence("all")}>
            {t("filters.allEvidence")}
          </FilterChip>
          {badges.map((b) => (
            <FilterChip key={b} active={evidence === b} onClick={() => setEvidence(b)}>
              {b}
            </FilterChip>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-fg-dim py-12">{t("empty")}</p>
      ) : (
        <ul className="mt-6 grid gap-3.5 list-none p-0">
          {visible.map((it) => (
            <Card key={it.id} item={it} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active}
      className="border px-3.5 py-1.5 text-meta transition-colors hairline text-fg-dim hover:text-fg data-[active=true]:text-fg data-[active=true]:border-line-bright"
      style={color && active ? { color, borderColor: color } : undefined}
    >
      {children}
    </button>
  );
}

/**
 * Display only: the stored text keeps the abstract's numbers verbatim
 * (verifyNumbers checks them), so "0.37" becomes "0,37" here, not in
 * the pipeline.
 */
function localDecimals(text: string, locale: string): string {
  return locale === "da" ? text.replace(/(\d)\.(\d)/g, "$1,$2") : text;
}

function formatDate(iso: string, locale: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(intlLocaleTag(locale), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** SMD before MD: "SMD" contains "MD". */
function effectMeasure(effect: string): "smd" | "md" | null {
  if (/\bSMD\b/.test(effect)) return "smd";
  if (/\bMD\b/.test(effect)) return "md";
  return null;
}

function Card({ item }: { item: ScienceFeedItem }) {
  const t = useTranslations("Science");
  const locale = useLocale();
  const color = DOMAIN_COLOR[item.domain];
  const measure = item.effectDa ? effectMeasure(item.effectDa) : null;
  return (
    <li className="flex overflow-hidden surface">
      <span className="w-[5px] shrink-0" style={{ background: color }} aria-hidden />
      <div className="px-5 py-4 min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2.5 text-micro">
          <span
            className="border px-2.5 py-0.5 font-medium"
            style={{ color, borderColor: color }}
          >
            {t(`domains.${item.domain}`)}
          </span>
          <span className="border surface-2 px-2.5 py-0.5">{item.evidenceBadge}</span>
          {item.verified && (
            <span className="text-food" title={t("verifiedTitle")}>
              ✓ {t("verified")}
            </span>
          )}
        </div>
        {/* The paper's own title: English, left as published. */}
        <h3 lang="en" className="mb-2 text-card">{item.title}</h3>
        <p className="mb-2 leading-relaxed">{localDecimals(item.tldrDa, locale)}</p>
        {item.effectDa && (
          <p className="mb-2 text-meta text-fg-dim">
            {t("effectLabel")}: <span className="numeric text-fg">{localDecimals(item.effectDa, locale)}</span>
            {measure ? <span className="block text-micro mt-0.5">{t(`effectHelp.${measure}`)}</span> : null}
          </p>
        )}
        {item.caveatDa && <p className="mb-2 text-meta text-fg-dim">{t("caveatLabel")}: {item.caveatDa}</p>}
        {item.sourceConclusion && (
          <figure className="mb-3 border-l-2 hairline-strong pl-3 text-meta text-fg-dim">
            <figcaption className="eyebrow mb-1">{t("conclusionLabel")}</figcaption>
            <blockquote lang="en">{item.sourceConclusion}</blockquote>
          </figure>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 text-micro text-fg-dim">
          <span>
            {item.journal}
            {item.publishedDate ? ` · ${formatDate(item.publishedDate, locale)}` : ""}
            {item.openAccess ? ` · ${t("openAccess")}` : ""}
          </span>
          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border-b border-fg-dim text-fg hover:border-fg"
            >
              {t("readSource")}
            </a>
          )}
        </div>
      </div>
    </li>
  );
}
