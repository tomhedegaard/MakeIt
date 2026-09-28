// src/lib/science/fetch.ts
// Fetches new studies from Europe PMC. Ported from the prototype
// (docs/science/science-prototype/src/fetch.mjs). Runs LIVE in production
// (uses global fetch); falls back to the bundled fixture if the network is
// unavailable or --fixture is requested. Keeps the "polite pool" User-Agent.

import { CONFIG, type DomainKey } from "./config";
import type { EuropePmcRecord } from "./types";
import { EUROPE_PMC_SAMPLE } from "./__fixtures__/europe-pmc-sample";

const EPMC = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";

// Per-domain search strings. The PUB_TYPE filter is part of the credibility
// gate already at the source, so we only pull strong study designs.
const QUERIES: Record<DomainKey, string> = {
  krop: "(resistance training OR hypertrophy OR strength training OR VO2max)",
  mad: "(protein intake OR creatine OR dietary supplement OR nutrition athletes)",
  sind: "(exercise depression OR mindfulness OR sleep mental health OR anxiety)",
};
const PUBTYPE =
  '(PUB_TYPE:"Meta-Analysis" OR PUB_TYPE:"Systematic Review" OR PUB_TYPE:"Randomized Controlled Trial")';

async function fetchDomainLive(domain: DomainKey): Promise<EuropePmcRecord[]> {
  const query = `${QUERIES[domain]} AND ${PUBTYPE}`;
  const url =
    `${EPMC}?query=${encodeURIComponent(query)}` +
    `&format=json&pageSize=25&resultType=core&sort=${encodeURIComponent("P_PDATE_D desc")}`;
  const res = await fetch(url, {
    headers: { "User-Agent": `MakeIt-Science/0.1 (${CONFIG.contact})` },
  });
  if (!res.ok) throw new Error(`Europe PMC ${res.status}`);
  const data = (await res.json()) as { resultList?: { result?: EuropePmcRecord[] } };
  return (data.resultList?.result ?? []).map((r) => ({ ...r, _domainHint: domain }));
}

export async function fetchAll(
  { live = true }: { live?: boolean } = {},
): Promise<{ source: "live" | "fixture"; records: EuropePmcRecord[] }> {
  if (live) {
    try {
      const results = await Promise.all((Object.keys(QUERIES) as DomainKey[]).map(fetchDomainLive));
      const flat = results.flat();
      if (flat.length) return { source: "live", records: flat };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[science/fetch] live fejlede (${msg}) — bruger fixture.`);
    }
  }
  return { source: "fixture", records: EUROPE_PMC_SAMPLE };
}
