import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPublishedScienceItems } from "@/lib/data/science";
import ScienceFeed from "./ScienceFeed";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Science");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { types: { "application/rss+xml": "/science/feed.xml" } },
  };
}

export default async function SciencePage() {
  const t = await getTranslations("Science");
  const items = await getPublishedScienceItems();

  return (
    <div className="mx-auto max-w-[860px] px-6 pb-24 pt-12 lg:pt-16">
      <header>
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="font-display mt-2 text-4xl sm:text-5xl">{t("title")}</h1>
        <p className="mt-3 max-w-[60ch] text-fg-dim">
          {t("subtitle")}{" "}
          <a href="/science/feed.xml" className="border-b border-fg-dim text-fg hover:border-fg">
            {t("rss")}
          </a>
        </p>
      </header>

      <ScienceFeed items={items} />

      <footer className="mt-12 border-t hairline pt-5 text-xs text-fg-dim">
        {t("disclaimer")}
      </footer>
    </div>
  );
}
