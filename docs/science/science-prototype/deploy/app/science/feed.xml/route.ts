// app/science/feed.xml/route.ts — RSS-endpoint (det "nørderne" abonnerer på).
import fs from "node:fs";
import path from "node:path";

export const revalidate = 3600;

const esc = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));

const LABEL: Record<string, string> = { mad: "Mad", krop: "Krop", sind: "Sind" };

export async function GET() {
  const p = path.join(process.cwd(), "data", "science-feed.json");
  let feed: any = { items: [], generated: new Date().toISOString() };
  try { feed = JSON.parse(fs.readFileSync(p, "utf8")); } catch {}

  const items = feed.items.map((it: any) => `  <item>
    <title>${esc(it.title)}</title>
    <link>${esc(it.sourceUrl)}</link>
    <guid isPermaLink="false">${esc(it.doi ?? it.id)}</guid>
    <category>${LABEL[it.domain]}</category>
    <pubDate>${new Date(it.publishedDate).toUTCString()}</pubDate>
    <description>${esc(`[${it.evidenceBadge}] ${it.tldr_da}`)}</description>
  </item>`).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>MakeIt // Science</title>
  <link>https://makeit.tomhedegaard.dk/science</link>
  <description>Nyeste troværdige forskning: kost, motion og mentalt velvære.</description>
  <lastBuildDate>${new Date(feed.generated).toUTCString()}</lastBuildDate>
${items}
</channel></rss>`;

  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}
