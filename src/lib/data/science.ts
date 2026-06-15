// src/lib/data/science.ts
// Read path for the Science feed. Server-only: used by /science (RSC) and the
// public RSS/JSON feed route handlers. Reads `published` rows via the anon
// SSR client (RLS restricts to status='published'); falls back to mock data in
// demo mode so the page renders without a backend, matching the repo pattern.

import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DomainKey } from "@/lib/science/config";

export interface ScienceFeedItem {
  id: string;
  doi: string | null;
  title: string;
  journal: string;
  domain: DomainKey;
  evidenceBadge: string;
  publishedDate: string | null;
  openAccess: boolean;
  sourceUrl: string | null;
  tldrDa: string;
  effectDa: string | null;
  caveatDa: string | null;
  sourceConclusion: string | null;
  verified: boolean;
  score: number | null;
}

interface ScienceRow {
  id: string;
  doi: string | null;
  title: string;
  journal: string | null;
  domain: DomainKey;
  evidence_badge: string | null;
  published_date: string | null;
  open_access: boolean | null;
  source_url: string | null;
  tldr_da: string | null;
  effect_da: string | null;
  caveat_da: string | null;
  source_conclusion: string | null;
  verified: boolean | null;
  score: number | null;
}

const SELECT =
  "id, doi, title, journal, domain, evidence_badge, published_date, open_access, source_url, tldr_da, effect_da, caveat_da, source_conclusion, verified, score";

function mapRow(r: ScienceRow): ScienceFeedItem {
  return {
    id: r.id,
    doi: r.doi,
    title: r.title,
    journal: r.journal ?? "",
    domain: r.domain,
    evidenceBadge: r.evidence_badge ?? "Studie",
    publishedDate: r.published_date,
    openAccess: !!r.open_access,
    sourceUrl: r.source_url,
    tldrDa: r.tldr_da ?? "",
    effectDa: r.effect_da,
    caveatDa: r.caveat_da,
    sourceConclusion: r.source_conclusion,
    verified: !!r.verified,
    score: r.score,
  };
}

/** Published feed items, newest + highest-scoring first. Empty array when the
 *  day produced nothing (the page renders the honest empty state). */
export async function getPublishedScienceItems(): Promise<ScienceFeedItem[]> {
  const supabase = await createClient();
  if (!supabase) return MOCK_ITEMS;

  const { data, error } = await supabase
    .from("science_items")
    .select(SELECT)
    .eq("status", "published")
    .order("score", { ascending: false })
    .order("published_date", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[data/science] read failed:", error.message);
    return [];
  }
  return ((data ?? []) as ScienceRow[]).map(mapRow);
}

// Demo-mode mock — two representative items so /science renders without a
// backend. Mirrors real pipeline output shape.
const MOCK_ITEMS: ScienceFeedItem[] = [
  {
    id: "mock-creatine",
    doi: "10.1080/15502783.2026.2668435",
    title:
      "Creatine monohydrate for lean mass, strength, and bone density in postmenopausal women: a systematic review and meta-analysis.",
    journal: "Journal of the International Society of Sports Nutrition",
    domain: "mad",
    evidenceBadge: "Meta-analyse",
    publishedDate: "2026-05-16",
    openAccess: true,
    sourceUrl: "https://doi.org/10.1080/15502783.2026.2668435",
    tldrDa:
      "Ny meta-analyse i Journal of the International Society of Sports Nutrition (Mad). 7 studier, 608 deltagere indgår. Rapporteret effekt: MD + 0.37 kg fedtfri masse; MD + 7.5 kg i benpres.",
    effectDa: "MD + 0.37 kg",
    caveatDa: "Effekten ses tydeligst ved ≥ 5 g/dag kombineret med styrketræning.",
    sourceConclusion:
      "In postmenopausal women, creatine, particularly >= 5 g/day with RT, yields small but meaningful gains in lean mass and strength without evidence of harm.",
    verified: true,
    score: 0.86,
  },
  {
    id: "mock-vr-mindfulness",
    doi: "10.1080/20008066.2026.2664277",
    title: "Effects of virtual reality mindfulness interventions on depression and anxiety: a meta-analysis.",
    journal: "European Journal of Psychotraumatology",
    domain: "sind",
    evidenceBadge: "Meta-analyse",
    publishedDate: "2026-05-26",
    openAccess: true,
    sourceUrl: "https://doi.org/10.1080/20008066.2026.2664277",
    tldrDa:
      "Ny meta-analyse i European Journal of Psychotraumatology (Sind). 15 studier, 864 deltagere indgår. VR-baseret mindfulness var forbundet med signifikant reduktion i depressions- og angstsymptomer.",
    effectDa: "SMD = -1.40",
    caveatDa: "Studier af høj kvalitet med længere opfølgning mangler stadig.",
    sourceConclusion:
      "VR-based mindfulness interventions are associated with reductions in depression and anxiety symptoms, though high-quality studies with longer follow-up are needed.",
    verified: true,
    score: 0.81,
  },
];
