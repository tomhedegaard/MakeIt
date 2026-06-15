// src/lib/science/pipeline.ts
// normalize -> dedupe -> gate -> score -> summarize (template baseline).
// Ported verbatim from the tested prototype (docs/science/science-prototype/
// src/pipeline.mjs). Each step is pure and testable. Nothing here invents data.
//
// The ONLY behavioural change from the prototype: `TODAY` is no longer a module
// constant — `score()`/`recencyScore()` take an injectable `now` so production
// uses the real clock and tests stay deterministic. The gates, weights and the
// number-verification guardrail are unchanged.

import { CONFIG, type DomainKey } from "./config";
import type {
  EuropePmcRecord,
  ScienceRecord,
  GateResult,
  ScoredRecord,
  NumberVerification,
  Summary,
} from "./types";

// ---- 1. NORMALIZE: Europe PMC record -> canonical record -------------------
export function normalize(r: EuropePmcRecord): ScienceRecord {
  const j = r.journalInfo?.journal ?? {};
  const pubTypes = r.pubTypeList?.pubType ?? [];
  const mesh = (r.meshHeadingList?.meshHeading ?? []).map((m) => ({
    name: m.descriptorName,
    major: m.majorTopic_YN === "Y",
  }));
  const doiUrl =
    (r.fullTextUrlList?.fullTextUrl ?? []).find((u) => u.site === "DOI")?.url ??
    (r.doi ? `https://doi.org/${r.doi}` : null);
  return {
    id: r.id,
    doi: r.doi ?? null,
    title: cleanTitle(r.title),
    authors: r.authorString ?? "",
    journal: j.title ?? "Ukendt tidsskrift",
    issn: [j.issn, j.essn].filter(Boolean) as string[],
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

// ---- 2. DEDUPE: same study from several sources merges on DOI/title --------
export function dedupe(items: ScienceRecord[]): ScienceRecord[] {
  const seen = new Map<string, ScienceRecord>();
  for (const it of items) {
    const key = it.doi?.toLowerCase() ?? normTitle(it.title);
    if (!seen.has(key)) seen.set(key, it);
  }
  return [...seen.values()];
}

// ---- 3. GATE: binary. A study is either qualified or dropped ---------------
export function gate(it: ScienceRecord): GateResult {
  // 3a. Retraction / blocked types
  if (it.pubTypes.some((t) => CONFIG.blockPubTypes.has(t)))
    return { ok: false, reason: "blokeret publikationstype (retraction/svag evidens)" };

  // 3b. Source quality: must be on the whitelist (here via ISSN)
  if (!it.issn.some((s) => CONFIG.journalWhitelistISSN.has(s)))
    return { ok: false, reason: `tidsskrift ikke på whitelist (${it.journal})` };

  // 3c. Study-type gate
  if (!it.pubTypes.some((t) => CONFIG.allowedPubTypes.has(t)))
    return { ok: false, reason: "ingen godkendt studietype" };

  // 3d. Abstract must be summarizable credibly
  if (it.abstract.length < 120)
    return { ok: false, reason: "abstract for kort til troværdigt resumé" };

  return { ok: true };
}

// ---- 4. SCORE --------------------------------------------------------------
export function score(it: ScienceRecord, now: Date = new Date()): ScoredRecord {
  const { relevance, domain } = relevanceScore(it);
  const evidence = evidenceScore(it);
  const recency = recencyScore(it, now);
  const source = sourceScore(it);
  const consensus = /meta-analysis|systematic review|cochrane/i.test(it.pubTypes.join(" ")) ? 1 : 0.4;

  const w = CONFIG.weights;
  const total =
    w.relevance * relevance +
    w.evidence * evidence.score +
    w.recency * recency +
    w.source * source +
    w.consensus * consensus;

  return {
    domain,
    parts: {
      relevance: round(relevance),
      evidence: round(evidence.score),
      recency: round(recency),
      source: round(source),
      consensus,
    },
    evidenceBadge: evidence.badge,
    total: round(total),
  };
}

function relevanceScore(it: ScienceRecord): { relevance: number; domain: DomainKey | null } {
  // MeSH major-topics weigh heaviest, then title, then abstract.
  const title = it.title.toLowerCase();
  const abs = it.abstract.toLowerCase();
  const majorMesh = it.mesh.filter((m) => m.major).map((m) => m.name.toLowerCase());

  let best: { domain: DomainKey | null; score: number } = { domain: null, score: 0 };
  for (const [key, def] of Object.entries(CONFIG.domains) as [DomainKey, (typeof CONFIG.domains)[DomainKey]][]) {
    let s = 0;
    for (const term of def.terms) {
      if (majorMesh.some((m) => m.includes(term))) s += 0.34; // heavy signal
      if (title.includes(term)) s += 0.18;
      if (abs.includes(term)) s += 0.05;
    }
    s = Math.min(1, s);
    if (s > best.score) best = { domain: key, score: s };
  }
  return { relevance: best.score, domain: best.domain };
}

function evidenceScore(it: ScienceRecord): { score: number; badge: string } {
  let best = { score: 0, badge: "Studie" };
  for (const t of it.pubTypes) {
    const e = CONFIG.evidenceRank[t];
    if (e && e.score > best.score) best = e;
  }
  return best;
}

function recencyScore(it: ScienceRecord, now: Date): number {
  if (!it.indexedDate) return 0;
  const days = (now.getTime() - new Date(it.indexedDate).getTime()) / 86400000;
  if (days > CONFIG.recencyWindowDays) return 0; // outside the window
  return Math.max(0, 1 - days / CONFIG.recencyWindowDays); // newer = higher
}

function sourceScore(it: ScienceRecord): number {
  // In production: normalised journal metric from OpenAlex (2-year mean-citedness).
  // Here: whitelisted journals get a solid base score + OA bonus.
  return Math.min(1, 0.8 + (it.openAccess ? 0.2 : 0));
}

// ---- 5. SUMMARIZE: Danish summary with deterministic number verification ---
// In production an LLM writes a 2-4 sentence summary (see summarize.ts). The
// guardrail: only numbers from the abstract may appear. This template-based
// generator (no invented numbers) is the always-safe baseline + the verifier.
export function summarize(it: ScienceRecord, scored: ScoredRecord): Summary {
  const concl = extractSection(it.abstract, ["Conclusion", "Conclusions"]) ?? lastSentences(it.abstract, 2);
  const effects = extractEffects(it.abstract);
  const n = extractParticipants(it.abstract);
  const domainLabel = scored.domain ? CONFIG.domains[scored.domain].label : "";

  // Templated Danish tldr — uses ONLY structured, verbatim facts.
  const parts: string[] = [];
  parts.push(`Ny ${scored.evidenceBadge.toLowerCase()} i ${it.journal} (${domainLabel}).`);
  if (n) parts.push(`${n} indgår.`);
  if (effects.length) parts.push(`Rapporteret effekt: ${effects.slice(0, 2).join("; ")}.`);
  const tldr = parts.join(" ");

  // --- NUMBER VERIFICATION: every number in the summary must be in the abstract.
  const verification = verifyNumbers(tldr, it.abstract);

  return {
    tldr_da: tldr,
    sourceConclusion: concl,
    effect_da: effects[0] ?? null,
    caveat_da: null,
    participants: n,
    verification,
    method: "template",
  };
}

// ---- Number verification (GUARDRAIL — DO NOT CHANGE) -----------------------
// Ported byte-for-byte from the prototype. Every number that appears in the
// summary must be found verbatim in the source abstract; otherwise the study
// is held back and never published. Brief §"Ufravigelige krav" #5.
export function verifyNumbers(summary: string, abstract: string): NumberVerification {
  const nums = summary.match(/-?\d+(?:[.,]\d+)?/g) ?? [];
  const absNorm = abstract.replace(/\s+/g, " ");
  const missing = nums.filter((nz) => !absNorm.includes(nz));
  return { ok: missing.length === 0, checked: nums.length, missing };
}

// ---- helpers ---------------------------------------------------------------
function extractEffects(text: string): string[] {
  // Catches e.g. "SMD = 0.15, p = 0.23", "MD + 7.5 kg (95% CI ...)".
  const out: string[] = [];
  const re =
    /\b(SMD|MD|HR|RR|OR|MD)\b[^.;()]*?(?:=|\s)\s*[+\-]?\s*\d+(?:[.,]\d+)?[^.;]*?(?:\([^)]*CI[^)]*\)|p\s*[=<]\s*\.?\d+)?/gi;
  for (const m of text.matchAll(re)) {
    if (out.length >= 4) break;
    out.push(m[0].replace(/\s+/g, " ").trim().replace(/[.,;]$/, ""));
  }
  return out;
}
function extractParticipants(text: string): string | null {
  const studies = text.match(/\b(\d{1,3})\s+(?:RCTs|studies|trials|randomized controlled trials)\b/i);
  const ppl = text.match(/\b(\d[\d,]{1,6})\s+(?:participants|athletes|patients|women|men|adults)\b/i);
  const a = studies ? `${studies[1]} studier` : null;
  const b = ppl ? `${ppl[1].replace(",", ".")} deltagere` : null;
  return [a, b].filter(Boolean).join(", ") || null;
}
function extractSection(text: string, names: string[]): string | null {
  for (const name of names) {
    const re = new RegExp(
      `${name}s?\\b[:.]?\\s*(.+?)(?:$|\\b(?:Background|Methods?|Results?|Objective|Registration)\\b)`,
      "i",
    );
    const m = text.match(re);
    if (m && m[1].trim().length > 20) return m[1].trim().replace(/\s+/g, " ");
  }
  return null;
}
function lastSentences(text: string, k: number): string {
  const s = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  return s.slice(-k).join(" ");
}
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const cleanTitle = (s: string | undefined): string => (s ?? "").replace(/\s+/g, " ").trim().replace(/\.$/, "");
const normTitle = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
const round = (n: number): number => Math.round(n * 100) / 100;
