// src/lib/science/config.ts
// All curation, weights and thresholds live here — not scattered in code.
// Ported verbatim from the tested prototype (docs/science/science-prototype/
// config.mjs); only types were added. Do NOT dilute the gates or thresholds:
// these are the credibility core (see brief §"Ufravigelige krav").
//
// In production this could move to a DB table so it changes without deploy;
// for v1 it is a single typed module imported by both the pipeline and the UI.

export type DomainKey = "mad" | "krop" | "sind";

export interface DomainConfig {
  label: string;
  color: string;
  terms: string[];
}

export interface EvidenceRankEntry {
  score: number;
  badge: string;
}

export interface ScienceConfig {
  recencyWindowDays: number;
  publishThreshold: number;
  weights: {
    relevance: number;
    evidence: number;
    recency: number;
    source: number;
    consensus: number;
  };
  minRelevance: number;
  journalWhitelistISSN: Set<string>;
  allowedPubTypes: Set<string>;
  blockPubTypes: Set<string>;
  domains: Record<DomainKey, DomainConfig>;
  evidenceRank: Record<string, EvidenceRankEntry>;
  contact: string;
}

export const CONFIG: ScienceConfig = {
  // How many days back a study may be indexed to count as "new".
  recencyWindowDays: 220,

  // Total score (0-1) a study must reach to be PUBLISHED.
  publishThreshold: 0.6,

  // Weights for the total score. Sum to 1.
  weights: { relevance: 0.35, evidence: 0.3, recency: 0.15, source: 0.15, consensus: 0.05 },

  // The hard lower relevance bound: below this a study is dropped regardless.
  minRelevance: 0.3,

  // --- CREDIBILITY GATE ----------------------------------------------------
  // Whitelist of journals (here via ISSN). In production supplement with
  // OpenAlex source-id + an objective quality rule (DOAJ/PubMed + citations).
  journalWhitelistISSN: new Set<string>([
    "0112-1642", "1179-2035", // Sports Medicine
    "1550-2783",              // J. Int. Society of Sports Nutrition
    "1467-7881", "1467-789X", // Obesity Reviews
    "2000-8066",              // European Journal of Psychotraumatology
    "0785-3890", "1365-2060", // Annals of Medicine (legit -> passes source, but falls on relevance)
    "0140-6736",              // The Lancet
    "1474-4422",              // Lancet Psychiatry (ex.)
  ]),

  // Only these publication types pass the study-type gate.
  allowedPubTypes: new Set<string>([
    "Meta-Analysis", "Systematic Review", "Randomized Controlled Trial",
    "Cochrane Review", "Guideline", "Consensus Development Conference",
  ]),

  // Always exclude (retraction / weak evidence).
  blockPubTypes: new Set<string>([
    "Retracted Publication", "Retraction of Publication",
    "Case Reports", "Comment", "Editorial", "Letter",
  ]),

  // --- RELEVANCE: domain vocabulary ----------------------------------------
  // MeSH major-topics and title/abstract terms that bind a study to a domain.
  domains: {
    krop: {
      label: "Krop", color: "#E8703A",
      terms: ["resistance training", "hypertrophy", "muscle strength", "muscle, skeletal",
        "strength training", "endurance training", "exercise", "training volume", "frequency",
        "vo2", "aerobic", "athletic performance", "muscle"],
    },
    mad: {
      label: "Mad", color: "#4CAF7D",
      terms: ["creatine", "dietary proteins", "protein", "dietary carbohydrates", "carbohydrate",
        "dietary supplements", "supplement", "nutrition", "diet", "omega-3", "intake",
        "body composition", "lean mass"],
    },
    sind: {
      label: "Sind", color: "#4F86C6",
      terms: ["depression", "anxiety", "mindfulness", "sleep", "mental health", "stress",
        "wellbeing", "mood", "cognitive", "psychological", "meditation"],
    },
  },

  // Evidence strength (ordinal) -> used in score AND as the visible badge.
  evidenceRank: {
    "Meta-Analysis":      { score: 1.0, badge: "Meta-analyse" },
    "Systematic Review":  { score: 0.9, badge: "Systematisk review" },
    "Cochrane Review":    { score: 1.0, badge: "Cochrane-review" },
    "Randomized Controlled Trial": { score: 0.7, badge: "RCT" },
    "Guideline":          { score: 0.6, badge: "Guideline" },
  },

  contact: "tomhedegaard@gmail.com", // used in the 'polite pool' against the APIs
};
