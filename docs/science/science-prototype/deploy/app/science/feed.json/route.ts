// app/science/feed.json/route.ts — JSON Feed-endpoint (jsonfeed.org).
import fs from "node:fs";
import path from "node:path";

export const revalidate = 3600;
const LABEL: Record<string, string> = { mad: "Mad", krop: "Krop", sind: "Sind" };

export async function GET() {
  const p = path.join(process.cwd(), "data", "science-feed.json");
  let feed: any = { items: [], generated: new Date().toISOString() };
  try { feed = JSON.parse(fs.readFileSync(p, "utf8")); } catch {}

  const out = {
    version: "https://jsonfeed.org/version/1.1",
    title: "MakeIt // Science",
    home_page_url: "https://makeit.tomhedegaard.dk/science",
    feed_url: "https://makeit.tomhedegaard.dk/science/feed.json",
    items: feed.items.map((it: any) => ({
      id: it.doi ?? it.id,
      url: it.sourceUrl,
      title: it.title,
      content_text: it.tldr_da,
      date_published: it.publishedDate,
      tags: [LABEL[it.domain], it.evidenceBadge],
    })),
  };
  return Response.json(out);
}
