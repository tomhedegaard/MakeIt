// src/lib/science/types.ts
// Canonical record shapes for the science pipeline.

import type { DomainKey } from "./config";

/** Raw Europe PMC result row (only the fields we read). */
export interface EuropePmcRecord {
  id: string;
  doi?: string | null;
  title?: string;
  authorString?: string;
  journalInfo?: { journal?: { title?: string; issn?: string; essn?: string } };
  pubTypeList?: { pubType?: string[] };
  meshHeadingList?: { meshHeading?: { descriptorName: string; majorTopic_YN: string }[] };
  abstractText?: string;
  firstPublicationDate?: string | null;
  firstIndexDate?: string | null;
  isOpenAccess?: string;
  fullTextUrlList?: { fullTextUrl?: { site: string; url: string }[] };
  _domainHint?: DomainKey | null;
}

/** Normalised, canonical record used by every downstream step. */
export interface ScienceRecord {
  id: string;
  doi: string | null;
  title: string;
  authors: string;
  journal: string;
  issn: string[];
  pubTypes: string[];
  mesh: { name: string; major: boolean }[];
  abstract: string;
  publishedDate: string | null;
  indexedDate: string | null;
  openAccess: boolean;
  sourceUrl: string | null;
  domainHint: DomainKey | null;
}

export interface GateResult {
  ok: boolean;
  reason?: string;
}

export interface ScoreParts {
  relevance: number;
  evidence: number;
  recency: number;
  source: number;
  consensus: number;
}

export interface ScoredRecord {
  domain: DomainKey | null;
  parts: ScoreParts;
  evidenceBadge: string;
  total: number;
}

export interface NumberVerification {
  ok: boolean;
  checked: number;
  missing: string[];
}

export interface Summary {
  tldr_da: string;
  sourceConclusion: string;
  effect_da: string | null;
  caveat_da: string | null;
  participants: string | null;
  verification: NumberVerification;
  method: string;
}

/** A study that passed all gates and is ready to persist as published. */
export interface PublishedScienceItem {
  id: string;
  doi: string | null;
  title: string;
  journal: string;
  domain: DomainKey;
  evidenceBadge: string;
  publishedDate: string | null;
  openAccess: boolean;
  sourceUrl: string | null;
  total: number;
  parts: ScoreParts;
  tldr_da: string;
  effect_da: string | null;
  caveat_da: string | null;
  sourceConclusion: string;
  verified: boolean;
  summaryMethod: string;
}

export interface RejectedScienceItem {
  id: string;
  doi: string | null;
  title: string;
  journal: string;
  reason: string;
}

export interface FeedRunResult {
  source: "live" | "fixture";
  generated: string;
  published: PublishedScienceItem[];
  rejected: RejectedScienceItem[];
}
