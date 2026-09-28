// src/app/science/feed.xml/route.ts — public RSS endpoint (what the "nerds"
// subscribe to in their feed reader). Reads published rows from Supabase via
// the shared data layer. Lives outside the (app) route group so it is public —
// feed readers have no session.

import { getPublishedScienceItems } from "@/lib/data/science";
import { DOMAIN_LABEL } from "@/lib/science/feed-labels";

export const dynamic = "force-dynamic";

const SITE = "https://makeit.tomhedegaard.dk";

const esc = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

export async function GET() {
  const items = await getPublishedScienceItems();
  const now = new Date().toUTCString();

  const entries = items
    .map(
      (it) => `  <item>
    <title>${esc(it.title)}</title>
    <link>${esc(it.sourceUrl ?? `${SITE}/science`)}</link>
    <guid isPermaLink="false">${esc(it.doi ?? it.id)}</guid>
    <category>${esc(DOMAIN_LABEL[it.domain])}</category>
    ${it.publishedDate ? `<pubDate>${new Date(it.publishedDate).toUTCString()}</pubDate>` : ""}
    <description>${esc(`[${it.evidenceBadge}] ${it.tldrDa}`)}</description>
  </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>MakeIt // Science</title>
  <link>${SITE}/science</link>
  <description>Nyeste troværdige forskning: kost, motion og mentalt velvære.</description>
  <lastBuildDate>${now}</lastBuildDate>
${entries}
</channel></rss>`;

  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}
