#!/usr/bin/env node
// run.mjs — orkestratoren. Kør: `node run.mjs`  (live)  eller  `node run.mjs --fixture`.
// Dette er præcis det script et dagligt cron-job / GitHub Action ville køre.

import { fetchAll } from "./src/fetch.mjs";
import { normalize, dedupe, gate, score } from "./src/pipeline.mjs";
import { summarizeProd } from "./src/summarize-llm.mjs";
import { writeFeeds } from "./src/feed.mjs";
import { CONFIG } from "./config.mjs";

const useFixture = process.argv.includes("--fixture");

const log = (s) => console.log(s);
log("\n=== MakeIt // Science — daglig pipeline ===\n");

const { source, records } = await fetchAll({ live: !useFixture });
log(`[1] FETCH      ${records.length} rå poster (kilde: ${source})`);

const normalized = records.map(normalize);
const deduped = dedupe(normalized);
log(`[2] NORMALIZE  ${normalized.length} -> [3] DEDUPE ${deduped.length} unikke`);

const published = [];
const rejected = [];

for (const it of deduped) {
  const g = gate(it);
  if (!g.ok) { rejected.push({ title: it.title, reason: g.reason }); continue; }

  const scored = score(it);

  if (scored.parts.recency === 0) {
    rejected.push({ title: it.title, reason: `uden for recency-vindue (>${CONFIG.recencyWindowDays} dage gammelt)` });
    continue;
  }
  if (scored.parts.relevance < CONFIG.minRelevance) {
    rejected.push({ title: it.title, reason: `under relevans-grænse (${scored.parts.relevance} < ${CONFIG.minRelevance})` });
    continue;
  }
  if (scored.total < CONFIG.publishThreshold) {
    rejected.push({ title: it.title, reason: `under publish-tærskel (${scored.total} < ${CONFIG.publishThreshold})` });
    continue;
  }

  const summary = await summarizeProd(it, scored);
  if (!summary.verification.ok) {
    rejected.push({ title: it.title, reason: `tal-verifikation fejlede (mangler: ${summary.verification.missing.join(", ")})` });
    continue;
  }

  published.push({
    id: it.id, doi: it.doi, title: it.title, journal: it.journal,
    domain: scored.domain, evidenceBadge: scored.evidenceBadge,
    publishedDate: it.publishedDate, openAccess: it.openAccess, sourceUrl: it.sourceUrl,
    total: scored.total, parts: scored.parts,
    tldr_da: summary.tldr_da, effect_da: summary.effect_da, caveat_da: summary.caveat_da ?? null,
    sourceConclusion: summary.sourceConclusion, verification: summary.verification,
    summaryMethod: summary.method,
  });
}

published.sort((a, b) => b.total - a.total);

log(`[4-6] GATE+SCORE+SUMMARIZE`);
log(`      ✓ UDGIVET: ${published.length}`);
published.forEach((p) => log(`        · [${p.domain}] ${p.total}  ${p.title.slice(0, 64)}…`));
log(`      ✗ AFVIST:  ${rejected.length}`);
rejected.forEach((r) => log(`        · ${r.reason}  —  ${r.title.slice(0, 54)}…`));

const meta = { generated: new Date().toISOString(), source };
await writeFeeds(published, meta);
log(`\n[7] PUBLISH    output/feed.json · output/feed.xml · output/science-demo.html\n`);
