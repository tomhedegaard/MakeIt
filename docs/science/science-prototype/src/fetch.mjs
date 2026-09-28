// fetch.mjs — henter nye studier fra Europe PMC.
// Kører LIVE hos jer (har netadgang). Falder tilbage til den vedlagte fixture
// hvis netværket ikke er tilgængeligt (fx i et sandkasse-miljø).

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { CONFIG } from "../config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EPMC = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";

// Søgestrenge pr. domæne. PUB_TYPE-filteret er en del af troværdigheds-gaten
// allerede ved kilden, så vi henter kun stærke studiedesigns.
const QUERIES = {
  krop: '(resistance training OR hypertrophy OR strength training OR VO2max)',
  mad:  '(protein intake OR creatine OR dietary supplement OR nutrition athletes)',
  sind: '(exercise depression OR mindfulness OR sleep mental health OR anxiety)',
};
const PUBTYPE = '(PUB_TYPE:"Meta-Analysis" OR PUB_TYPE:"Systematic Review" OR PUB_TYPE:"Randomized Controlled Trial")';

async function fetchDomainLive(domain) {
  const query = `${QUERIES[domain]} AND ${PUBTYPE}`;
  const url = `${EPMC}?query=${encodeURIComponent(query)}` +
    `&format=json&pageSize=25&resultType=core&sort=${encodeURIComponent("P_PDATE_D desc")}`;
  const res = await fetch(url, { headers: { "User-Agent": `MakeIt-Science/0.1 (${CONFIG.contact})` } });
  if (!res.ok) throw new Error(`Europe PMC ${res.status}`);
  const data = await res.json();
  return (data.resultList?.result ?? []).map((r) => ({ ...r, _domainHint: domain }));
}

export async function fetchAll({ live = true } = {}) {
  if (live) {
    try {
      const results = await Promise.all(Object.keys(QUERIES).map(fetchDomainLive));
      const flat = results.flat();
      if (flat.length) return { source: "live", records: flat };
    } catch (err) {
      console.warn(`[fetch] live fejlede (${err.message}) — bruger fixture.`);
    }
  }
  const raw = await readFile(path.join(__dirname, "../fixtures/europepmc-sample.json"), "utf8");
  return { source: "fixture", records: JSON.parse(raw).result };
}
