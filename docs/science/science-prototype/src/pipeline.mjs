// pipeline.mjs — normalize -> dedupe -> gate -> score -> summarize.
// Hvert trin er rent og testbart. Intet her opfinder data.

import { CONFIG } from "../config.mjs";

const TODAY = new Date("2026-06-13"); // i produktion: new Date()

// ---- 1. NORMALIZE: Europe PMC-record -> kanonisk record --------------------
export function normalize(r) {
  const j = r.journalInfo?.journal ?? {};
  const pubTypes = r.pubTypeList?.pubType ?? [];
  const mesh = (r.meshHeadingList?.meshHeading ?? []).map((m) => ({
    name: m.descriptorName, major: m.majorTopic_YN === "Y",
  }));
  const doiUrl = (r.fullTextUrlList?.fullTextUrl ?? []).find((u) => u.site === "DOI")?.url
    ?? (r.doi ? `https://doi.org/${r.doi}` : null);
  return {
    id: r.id,
    doi: r.doi ?? null,
    title: cleanTitle(r.title),
    authors: r.authorString ?? "",
    journal: j.title ?? "Ukendt tidsskrift",
    issn: [j.issn, j.essn].filter(Boolean),
    pubTypes,
    mesh,
    abstract: stripTags(r.abstractText ?? ""),
    publishedDate: r.firstPublicationDate ?? null,
    indexedDate: r.firstIndexDate ?? r.firstPublicationDate ?? null,
    openAccess: r.isOpenAccess === "Y",
    sourceUrl: doiUrl,
    domainHint: r._domainHint ?? null,
  };
}

// ---- 2. DEDUPE: samme studie fra flere kilder slås sammen på DOI/titel -----
export function dedupe(items) {
  const seen = new Map();
  for (const it of items) {
    const key = it.doi?.toLowerCase() ?? normTitle(it.title);
    if (!seen.has(key)) seen.set(key, it);
  }
  return [...seen.values()];
}

// ---- 3. GATE: binær. Et studie er enten kvalificeret eller droppet ---------
export function gate(it) {
  // 3a. Retraction / blokerede typer
  if (it.pubTypes.some((t) => CONFIG.blockPubTypes.has(t)))
    return { ok: false, reason: "blokeret publikationstype (retraction/svag evidens)" };

  // 3b. Kilde-kvalitet: skal være på whitelisten (her via ISSN)
  if (!it.issn.some((s) => CONFIG.journalWhitelistISSN.has(s)))
    return { ok: false, reason: `tidsskrift ikke på whitelist (${it.journal})` };

  // 3c. Studietype-gate
  if (!it.pubTypes.some((t) => CONFIG.allowedPubTypes.has(t)))
    return { ok: false, reason: "ingen godkendt studietype" };

  // 3d. Abstract skal kunne resumeres troværdigt
  if (it.abstract.length < 120)
    return { ok: false, reason: "abstract for kort til troværdigt resumé" };

  return { ok: true };
}

// ---- 4. SCORE --------------------------------------------------------------
export function score(it) {
  const { relevance, domain } = relevanceScore(it);
  const evidence = evidenceScore(it);
  const recency = recencyScore(it);
  const source = sourceScore(it);
  const consensus = /meta-analysis|systematic review|cochrane/i.test(it.pubTypes.join(" ")) ? 1 : 0.4;

  const w = CONFIG.weights;
  const total = w.relevance * relevance + w.evidence * evidence.score +
    w.recency * recency + w.source * source + w.consensus * consensus;

  return {
    domain,
    parts: { relevance: round(relevance), evidence: round(evidence.score), recency: round(recency), source: round(source), consensus },
    evidenceBadge: evidence.badge,
    total: round(total),
  };
}

function relevanceScore(it) {
  // MeSH-major-topics vejer tungest, derefter titel, derefter abstract.
  const title = it.title.toLowerCase();
  const abs = it.abstract.toLowerCase();
  const majorMesh = it.mesh.filter((m) => m.major).map((m) => m.name.toLowerCase());

  let best = { domain: null, score: 0 };
  for (const [key, def] of Object.entries(CONFIG.domains)) {
    let s = 0;
    for (const term of def.terms) {
      if (majorMesh.some((m) => m.includes(term))) s += 0.34; // tungt signal
      if (title.includes(term)) s += 0.18;
      if (abs.includes(term)) s += 0.05;
    }
    s = Math.min(1, s);
    if (s > best.score) best = { domain: key, score: s };
  }
  return { relevance: best.score, domain: best.domain };
}

function evidenceScore(it) {
  let best = { score: 0, badge: "Studie" };
  for (const t of it.pubTypes) {
    const e = CONFIG.evidenceRank[t];
    if (e && e.score > best.score) best = e;
  }
  return best;
}

function recencyScore(it) {
  if (!it.indexedDate) return 0;
  const days = (TODAY - new Date(it.indexedDate)) / 86400000;
  if (days > CONFIG.recencyWindowDays) return 0;          // uden for vinduet
  return Math.max(0, 1 - days / CONFIG.recencyWindowDays); // nyere = højere
}

function sourceScore(it) {
  // I produktion: normaliseret tidsskrift-metric fra OpenAlex (2-årig mean-citedness).
  // Her: whitelistede tidsskrifter får en solid basisscore + OA-bonus.
  return Math.min(1, 0.8 + (it.openAccess ? 0.2 : 0));
}

// ---- 5. SUMMARIZE: dansk resumé med deterministisk tal-verifikation --------
// I produktion skriver en LLM her et 2-4 sætnings resumé. Guardrail: kun tal
// fra abstractet må optræde. Vi DEMONSTRERER den guardrail med en ren,
// template-baseret generator (ingen opfundne tal) + et verifikations-tjek.
export function summarize(it, scored) {
  const concl = extractSection(it.abstract, ["Conclusion", "Conclusions"]) ?? lastSentences(it.abstract, 2);
  const effects = extractEffects(it.abstract);
  const n = extractParticipants(it.abstract);
  const domainLabel = CONFIG.domains[scored.domain].label;

  // Templated dansk tldr — bruger KUN strukturerede, verbatim facts.
  const parts = [];
  parts.push(`Ny ${scored.evidenceBadge.toLowerCase()} i ${it.journal} (${domainLabel}).`);
  if (n) parts.push(`${n} indgår.`);
  if (effects.length) parts.push(`Rapporteret effekt: ${effects.slice(0, 2).join("; ")}.`);
  const tldr = parts.join(" ");

  // --- TAL-VERIFIKATION: ethvert tal i resuméet skal genfindes i abstractet.
  const verification = verifyNumbers(tldr, it.abstract);

  return {
    tldr_da: tldr,
    sourceConclusion: concl,      // verbatim fra kilden (ingen oversættelse opfundet)
    effect_da: effects[0] ?? null,
    participants: n,
    verification,
  };
}

// ---- Tal-verifikation ------------------------------------------------------
export function verifyNumbers(summary, abstract) {
  const nums = (summary.match(/-?\d+(?:[.,]\d+)?/g) ?? []);
  const absNorm = abstract.replace(/\s+/g, " ");
  const missing = nums.filter((nz) => !absNorm.includes(nz));
  return { ok: missing.length === 0, checked: nums.length, missing };
}

// ---- helpers ---------------------------------------------------------------
function extractEffects(text) {
  // Fanger fx "SMD = 0.15, p = 0.23", "MD + 7.5 kg (95% CI ...)".
  const out = [];
  const re = /\b(SMD|MD|HR|RR|OR|MD)\b[^.;()]*?(?:=|\s)\s*[+\-]?\s*\d+(?:[.,]\d+)?[^.;]*?(?:\([^)]*CI[^)]*\)|p\s*[=<]\s*\.?\d+)?/gi;
  let m;
  while ((m = re.exec(text)) && out.length < 4) out.push(m[0].replace(/\s+/g, " ").trim().replace(/[.,;]$/, ""));
  return out;
}
function extractParticipants(text) {
  const studies = text.match(/\b(\d{1,3})\s+(?:RCTs|studies|trials|randomized controlled trials)\b/i);
  const ppl = text.match(/\b(\d[\d,]{1,6})\s+(?:participants|athletes|patients|women|men|adults)\b/i);
  const a = studies ? `${studies[1]} studier` : null;
  const b = ppl ? `${ppl[1].replace(",", ".")} deltagere` : null;
  return [a, b].filter(Boolean).join(", ") || null;
}
function extractSection(text, names) {
  for (const name of names) {
    const re = new RegExp(`${name}s?\\b[:.]?\\s*(.+?)(?:$|\\b(?:Background|Methods?|Results?|Objective|Registration)\\b)`, "i");
    const m = text.match(re);
    if (m && m[1].trim().length > 20) return m[1].trim().replace(/\s+/g, " ");
  }
  return null;
}
function lastSentences(text, k) {
  const s = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  return s.slice(-k).join(" ");
}
const stripTags = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const cleanTitle = (s) => (s ?? "").replace(/\s+/g, " ").trim().replace(/\.$/, "");
const normTitle = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
const round = (n) => Math.round(n * 100) / 100;
