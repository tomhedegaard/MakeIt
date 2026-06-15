// src/lib/science/run.ts
// The daily pipeline orchestrator — exactly what the cron route and the CLI
// script (scripts/science-feed.ts) both run. Ported from the prototype
// (docs/science/science-prototype/run.mjs); the gate order and thresholds are
// unchanged. The Supabase (service-role) client is injected so the core stays
// testable and runnable from both Next and a plain Node/tsx script.

import type { SupabaseClient } from "@supabase/supabase-js";
import { CONFIG } from "./config";
import { fetchAll } from "./fetch";
import { normalize, dedupe, gate, score } from "./pipeline";
import { summarizeProd } from "./summarize";
import type {
  PublishedScienceItem,
  RejectedScienceItem,
  ScienceRecord,
  FeedRunResult,
} from "./types";

export interface RunOptions {
  /** Supabase service-role client. Omit (or dryRun) to skip persistence. */
  db?: SupabaseClient | null;
  /** Hit Europe PMC live (default) or use the offline fixture. */
  live?: boolean;
  /** Compute + log but do not write to the datastore. */
  dryRun?: boolean;
  /** Clock injection for deterministic tests. */
  now?: Date;
  /** Anthropic API key override (defaults to process.env.ANTHROPIC_API_KEY). */
  apiKey?: string;
  log?: (msg: string) => void;
}

const EVIDENCE_LEVEL: Record<string, string> = {
  "Meta-Analysis": "meta_analysis",
  "Cochrane Review": "cochrane_review",
  "Systematic Review": "systematic_review",
  "Randomized Controlled Trial": "rct",
  Guideline: "guideline",
};

function deriveEvidenceLevel(pubTypes: string[]): string | null {
  let best: { level: string; rank: number } | null = null;
  for (const t of pubTypes) {
    const entry = CONFIG.evidenceRank[t];
    const level = EVIDENCE_LEVEL[t];
    if (entry && level && (!best || entry.score > best.rank)) {
      best = { level, rank: entry.score };
    }
  }
  return best?.level ?? null;
}

/** Run the full pipeline. Returns the published + rejected sets and persists
 *  both (audit/open-brain) unless dryRun. Idempotent upsert on source_id. */
export async function runScienceFeed(opts: RunOptions = {}): Promise<FeedRunResult> {
  const { db = null, live = true, dryRun = false, now = new Date(), apiKey } = opts;
  const log = opts.log ?? (() => {});

  const { source, records } = await fetchAll({ live });
  log(`[1] FETCH      ${records.length} rå poster (kilde: ${source})`);

  const normalized = records.map(normalize);
  const deduped = dedupe(normalized);
  log(`[2] NORMALIZE  ${normalized.length} -> [3] DEDUPE ${deduped.length} unikke`);

  const published: PublishedScienceItem[] = [];
  const rejected: RejectedScienceItem[] = [];
  const reject = (it: ScienceRecord, reason: string) =>
    rejected.push({ id: it.id, doi: it.doi, title: it.title, journal: it.journal, reason });

  for (const it of deduped) {
    const g = gate(it);
    if (!g.ok) {
      reject(it, g.reason ?? "afvist af gate");
      continue;
    }

    const scored = score(it, now);

    if (scored.parts.recency === 0) {
      reject(it, `uden for recency-vindue (>${CONFIG.recencyWindowDays} dage gammelt)`);
      continue;
    }
    if (scored.parts.relevance < CONFIG.minRelevance) {
      reject(it, `under relevans-grænse (${scored.parts.relevance} < ${CONFIG.minRelevance})`);
      continue;
    }
    if (scored.total < CONFIG.publishThreshold) {
      reject(it, `under publish-tærskel (${scored.total} < ${CONFIG.publishThreshold})`);
      continue;
    }

    const summary = await summarizeProd(it, scored, { apiKey });
    if (!summary.verification.ok) {
      reject(it, `tal-verifikation fejlede (mangler: ${summary.verification.missing.join(", ")})`);
      continue;
    }

    // domain is non-null here: relevance passed minRelevance > 0.
    published.push({
      id: it.id,
      doi: it.doi,
      title: it.title,
      journal: it.journal,
      domain: scored.domain!,
      evidenceBadge: scored.evidenceBadge,
      publishedDate: it.publishedDate,
      openAccess: it.openAccess,
      sourceUrl: it.sourceUrl,
      total: scored.total,
      parts: scored.parts,
      tldr_da: summary.tldr_da,
      effect_da: summary.effect_da,
      caveat_da: summary.caveat_da ?? null,
      sourceConclusion: summary.sourceConclusion,
      verified: summary.verification.ok,
      summaryMethod: summary.method,
    });
  }

  published.sort((a, b) => b.total - a.total);

  log(`[4-6] GATE+SCORE+SUMMARIZE`);
  log(`      ✓ UDGIVET: ${published.length}`);
  published.forEach((p) => log(`        · [${p.domain}] ${p.total}  ${p.title.slice(0, 64)}…`));
  log(`      ✗ AFVIST:  ${rejected.length}`);
  rejected.forEach((r) => log(`        · ${r.reason}  —  ${r.title.slice(0, 54)}…`));

  const generated = now.toISOString();

  if (!dryRun && db) {
    const rows = [
      ...published.map((p) => ({
        source_id: p.id,
        doi: p.doi,
        title: p.title,
        domain: p.domain,
        evidence_level: deriveEvidenceLevel(
          deduped.find((d) => d.id === p.id)?.pubTypes ?? [],
        ),
        evidence_badge: p.evidenceBadge,
        journal: p.journal,
        published_date: p.publishedDate,
        indexed_date: deduped.find((d) => d.id === p.id)?.indexedDate ?? null,
        open_access: p.openAccess,
        source_url: p.sourceUrl,
        tldr_da: p.tldr_da,
        effect_da: p.effect_da,
        caveat_da: p.caveat_da,
        source_conclusion: p.sourceConclusion,
        score: p.total,
        score_parts: p.parts,
        verified: p.verified,
        summary_method: p.summaryMethod,
        status: "published" as const,
        reject_reason: null,
      })),
      ...rejected.map((r) => ({
        source_id: r.id,
        doi: r.doi,
        title: r.title,
        journal: r.journal,
        status: "rejected" as const,
        reject_reason: r.reason,
      })),
    ];

    const { error } = await db.from("science_items").upsert(rows, { onConflict: "source_id" });
    if (error) throw new Error(`science_items upsert failed: ${error.message}`);
    log(`[7] PUBLISH    upsert ${rows.length} rækker (${published.length} published / ${rejected.length} rejected)`);
  } else {
    log(`[7] PUBLISH    dry-run — intet skrevet`);
  }

  return { source, generated, published, rejected };
}
