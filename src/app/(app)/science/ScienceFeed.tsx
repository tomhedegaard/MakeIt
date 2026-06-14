"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
      className="rounded-full border px-3.5 py-1.5 text-[13px] transition-colors hairline text-fg-dim hover:text-fg data-[active=true]:text-fg data-[active=true]:border-line-bright"
      style={color && active ? { color, borderColor: color } : undefined}
    >
      {children}
    </button>
  );
}

function Card({ item }: { item: ScienceFeedItem }) {
  const t = useTranslations("Science");
  const color = DOMAIN_COLOR[item.domain];
  return (
    <li className="flex overflow-hidden rounded-2xl surface">
      <span className="w-[5px] shrink-0" style={{ background: color }} aria-hidden />
      <div className="px-5 py-4 min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2.5 text-xs">
          <span
            className="rounded-full border px-2.5 py-0.5 font-semibold"
            style={{ color, borderColor: color }}
          >
            {t(`domains.${item.domain}`)}
          </span>
          <span className="rounded-full border surface-2 px-2.5 py-0.5">{item.evidenceBadge}</span>
          {item.verified && (
            <span className="text-[#4CAF7D]" title={t("verifiedTitle")}>
              ✓ {t("verified")}
            </span>
          )}
        </div>
        <h2 className="mb-2 text-[17px] leading-snug">{item.title}</h2>
        <p className="mb-2 leading-relaxed">{item.tldrDa}</p>
        {item.effectDa && (
          <p className="mb-2 text-[13px] text-fg-dim">
            {t("effectLabel")}: <code className="numeric rounded surface-2 px-1.5 py-0.5 text-xs">{item.effectDa}</code>
          </p>
        )}
        {item.caveatDa && <p className="mb-2 text-[13px] text-fg-dim">{t("caveatLabel")}: {item.caveatDa}</p>}
        {item.sourceConclusion && (
          <p className="mb-3 border-l-2 hairline-strong pl-3 text-[13px] text-fg-dim">{item.sourceConclusion}</p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-fg-dim">
          <span>
            {item.journal}
            {item.publishedDate ? ` · ${item.publishedDate}` : ""}
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
