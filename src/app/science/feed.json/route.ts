// src/app/science/feed.json/route.ts — public JSON Feed endpoint (jsonfeed.org).
// Reads published rows from Supabase via the shared data layer. Public: lives
// outside the (app) route group.

import { getPublishedScienceItems } from "@/lib/data/science";
import { DOMAIN_LABEL } from "@/lib/science/feed-labels";

export const dynamic = "force-dynamic";

const SITE = "https://makeit.tomhedegaard.dk";

export async function GET() {
  const items = await getPublishedScienceItems();

  const out = {
    version: "https://jsonfeed.org/version/1.1",
    title: "MakeIt // Science",
    home_page_url: `${SITE}/science`,
    feed_url: `${SITE}/science/feed.json`,
    description: "Nyeste troværdige forskning: kost, motion og mentalt velvære.",
    items: items.map((it) => ({
      id: it.doi ?? it.id,
      url: it.sourceUrl ?? `${SITE}/science`,
      title: it.title,
      content_text: it.tldrDa,
      date_published: it.publishedDate,
      tags: [DOMAIN_LABEL[it.domain], it.evidenceBadge],
    })),
  };

  return Response.json(out);
}
