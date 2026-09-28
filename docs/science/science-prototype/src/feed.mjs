// feed.mjs — skriver de tre outputs: feed.json, feed.xml (RSS) og demo-HTML.

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CONFIG } from "../config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../output");
const esc = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));

export async function writeFeeds(items, meta) {
  await writeFile(path.join(OUT, "feed.json"), JSON.stringify({ generated: meta.generated, source: meta.source, count: items.length, items }, null, 2));
  await writeFile(path.join(OUT, "feed.xml"), rss(items, meta));
  await writeFile(path.join(OUT, "science-demo.html"), html(items, meta));
}

// --- RSS / Atom (det de "nørdede" abonnerer på i deres feedlæser) -----------
function rss(items, meta) {
  const entries = items.map((it) => `    <item>
      <title>${esc(it.title)}</title>
      <link>${esc(it.sourceUrl)}</link>
      <guid isPermaLink="false">${esc(it.doi ?? it.id)}</guid>
      <category>${esc(CONFIG.domains[it.domain].label)}</category>
      <pubDate>${new Date(it.publishedDate).toUTCString()}</pubDate>
      <description>${esc(`[${it.evidenceBadge}] ${it.tldr_da}`)}</description>
    </item>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
    <title>MakeIt // Science</title>
    <link>https://makeit.tomhedegaard.dk/science</link>
    <description>Nyeste troværdige forskning: kost, motion og mentalt velvære.</description>
    <lastBuildDate>${new Date(meta.generated).toUTCString()}</lastBuildDate>
${entries}
</channel></rss>`;
}

// --- Demo-side i MakeIt's sort/hvide stil med farve som domæne-signal -------
function html(items, meta) {
  const cards = items.map((it) => {
    const c = CONFIG.domains[it.domain];
    const ok = it.verification.ok;
    return `<article class="card" data-domain="${it.domain}">
      <div class="bar" style="background:${c.color}"></div>
      <div class="body">
        <div class="meta">
          <span class="tag" style="--c:${c.color}">${c.label}</span>
          <span class="badge">${esc(it.evidenceBadge)}</span>
          <span class="verify ${ok ? "ok" : "fail"}" title="Tal-verifikation mod kildens abstract">${ok ? "✓ tal verificeret" : "⚠ tal-mismatch"}</span>
          <span class="score">score ${it.total}</span>
        </div>
        <h2>${esc(it.title)}</h2>
        <p class="tldr">${esc(it.tldr_da)}</p>
        ${it.effect_da ? `<p class="effect">Effekt: <code>${esc(it.effect_da)}</code></p>` : ""}
        <p class="concl">${esc(it.sourceConclusion)}</p>
        <div class="foot">
          <span>${esc(it.journal)} · ${esc(it.publishedDate)}${it.openAccess ? " · Open Access" : ""}</span>
          <a href="${esc(it.sourceUrl)}" target="_blank" rel="noopener">Læs kilden →</a>
        </div>
      </div>
    </article>`;
  }).join("\n");

  return `<!doctype html><html lang="da"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MakeIt // Science</title>
<style>
  :root{ --bg:#0A0A0B; --panel:#141416; --line:#26262b; --fg:#ECECEE; --mut:#8A8A92; }
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--fg);
    font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
  header{padding:48px 24px 24px;max-width:860px;margin:0 auto}
  .kick{letter-spacing:.18em;font-size:11px;color:var(--mut);text-transform:uppercase}
  h1{font-size:40px;margin:.2em 0 .1em;font-weight:800;letter-spacing:-.02em}
  .sub{color:var(--mut);max-width:56ch}
  .filters{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}
  .filters button{background:var(--panel);border:1px solid var(--line);color:var(--fg);
    padding:6px 14px;border-radius:999px;cursor:pointer;font-size:13px}
  .filters button.active{border-color:var(--fg)}
  main{max-width:860px;margin:0 auto;padding:8px 24px 80px;display:grid;gap:14px}
  .card{display:flex;background:var(--panel);border:1px solid var(--line);border-radius:14px;overflow:hidden}
  .bar{width:5px;flex:none}
  .body{padding:18px 20px}
  .meta{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:12px;margin-bottom:8px}
  .tag{color:var(--c);border:1px solid var(--c);padding:2px 9px;border-radius:999px;font-weight:600}
  .badge{background:#1d1d22;border:1px solid var(--line);padding:2px 9px;border-radius:999px;color:var(--fg)}
  .verify.ok{color:#4CAF7D} .verify.fail{color:#E8703A}
  .score{margin-left:auto;color:var(--mut)}
  h2{font-size:18px;margin:2px 0 8px;line-height:1.3}
  .tldr{margin:0 0 8px}
  .effect{margin:0 0 8px;color:var(--mut);font-size:13px}
  .effect code,code{background:#1d1d22;padding:1px 6px;border-radius:5px;font-size:12px}
  .concl{margin:0 0 12px;color:var(--mut);font-size:13px;border-left:2px solid var(--line);padding-left:12px}
  .foot{display:flex;justify-content:space-between;gap:12px;align-items:center;font-size:12px;color:var(--mut);flex-wrap:wrap}
  .foot a{color:var(--fg);text-decoration:none;border-bottom:1px solid var(--mut)}
  footer{max-width:860px;margin:0 auto;padding:0 24px 60px;color:var(--mut);font-size:12px}
  .disc{border-top:1px solid var(--line);padding-top:16px}
</style></head><body>
<header>
  <div class="kick">MakeIt // HQ · Science</div>
  <h1>Nyeste viden, filtreret hårdt.</h1>
  <p class="sub">Troværdig forskning om kost, motion og mentalt velvære — kun meta-analyser, systematiske reviews og RCT'er fra whitelistede tidsskrifter. Opdateres automatisk hver dag.</p>
  <div class="filters">
    <button class="active" data-f="all">Alle</button>
    <button data-f="mad" style="--c:#4CAF7D">Mad</button>
    <button data-f="krop" style="--c:#E8703A">Krop</button>
    <button data-f="sind" style="--c:#4F86C6">Sind</button>
  </div>
</header>
<main id="feed">
${cards}
</main>
<footer><p class="disc">Forskningsresumeer — ikke individuel sundheds- eller kostrådgivning. Genereret ${new Date(meta.generated).toLocaleString("da-DK")} · kilde: ${meta.source} · ${items.length} studier passerede tærsklen · feed: /science/feed.xml</p></footer>
<script>
  const btns=[...document.querySelectorAll('.filters button')];
  btns.forEach(b=>b.onclick=()=>{btns.forEach(x=>x.classList.remove('active'));b.classList.add('active');
    const f=b.dataset.f;document.querySelectorAll('.card').forEach(c=>{c.style.display=(f==='all'||c.dataset.domain===f)?'flex':'none';});});
</script>
</body></html>`;
}
