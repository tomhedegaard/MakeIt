// app/science/page.tsx — drop-in Next.js (App Router) side for /science.
// Læser det daglige feed (data/science-feed.json), genereret af GitHub Action.
// Ingen eksterne API-kald i request-path -> hurtig side.

import fs from "node:fs";
import path from "node:path";

export const revalidate = 3600; // re-render højst hver time

type Item = {
  id: string; doi: string | null; title: string; journal: string;
  domain: "mad" | "krop" | "sind"; evidenceBadge: string;
  publishedDate: string; openAccess: boolean; sourceUrl: string;
  total: number; tldr_da: string; effect_da: string | null;
  caveat_da: string | null; sourceConclusion: string;
  verification: { ok: boolean };
};

const DOMAIN = {
  mad:  { label: "Mad",  color: "#4CAF7D" },
  krop: { label: "Krop", color: "#E8703A" },
  sind: { label: "Sind", color: "#4F86C6" },
} as const;

function loadFeed(): { items: Item[]; generated: string } {
  const p = path.join(process.cwd(), "data", "science-feed.json");
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return { items: [], generated: new Date().toISOString() };
  }
}

export const metadata = {
  title: "MakeIt // Science",
  description: "Nyeste troværdige forskning: kost, motion og mentalt velvære.",
  alternates: { types: { "application/rss+xml": "/science/feed.xml" } },
};

export default function SciencePage() {
  const { items, generated } = loadFeed();

  return (
    <main className="science">
      <header>
        <p className="kick">MakeIt // HQ · Science</p>
        <h1>Nyeste viden, filtreret hårdt.</h1>
        <p className="sub">
          Troværdig forskning om kost, motion og mentalt velvære — kun meta-analyser,
          systematiske reviews og RCT&apos;er fra whitelistede tidsskrifter. Opdateres
          automatisk hver dag. <a href="/science/feed.xml">RSS</a>
        </p>
      </header>

      {items.length === 0 ? (
        <p className="empty">Ingen nye studier passerede tærsklen i dag.</p>
      ) : (
        <ul className="feed">
          {items.map((it) => {
            const d = DOMAIN[it.domain];
            return (
              <li key={it.id} className="card">
                <span className="bar" style={{ background: d.color }} />
                <div className="body">
                  <div className="meta">
                    <span className="tag" style={{ color: d.color, borderColor: d.color }}>{d.label}</span>
                    <span className="badge">{it.evidenceBadge}</span>
                    {it.verification.ok && <span className="verify">✓ tal verificeret</span>}
                  </div>
                  <h2>{it.title}</h2>
                  <p className="tldr">{it.tldr_da}</p>
                  {it.effect_da && <p className="effect">Effekt: <code>{it.effect_da}</code></p>}
                  {it.caveat_da && <p className="caveat">Forbehold: {it.caveat_da}</p>}
                  <div className="foot">
                    <span>{it.journal} · {it.publishedDate}{it.openAccess ? " · Open Access" : ""}</span>
                    <a href={it.sourceUrl} target="_blank" rel="noopener noreferrer">Læs kilden →</a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <footer>
        Forskningsresumeer — ikke individuel sundheds- eller kostrådgivning.
        Sidst opdateret {new Date(generated).toLocaleString("da-DK")}.
      </footer>
    </main>
  );
}
