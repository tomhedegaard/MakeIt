import { describe, it, expect } from "vitest";
import { normalize, gate, score, dedupe, verifyNumbers } from "./pipeline";
import { EUROPE_PMC_SAMPLE } from "./__fixtures__/europe-pmc-sample";
import type { EuropePmcRecord } from "./types";

const NOW = new Date("2026-06-13"); // pin the clock so recency is deterministic
const byId = (id: string) => normalize(EUROPE_PMC_SAMPLE.find((r) => r.id === id)!);

describe("verifyNumbers (credibility guardrail — must stay byte-identical)", () => {
  const abstract =
    "Lean mass favored creatine: mean difference (MD) + 0.37 kg (95% CI + 0.05 to + 0.69).";

  it("passes when every number is found verbatim in the abstract", () => {
    const v = verifyNumbers("Rapporteret effekt: MD + 0.37 kg.", abstract);
    expect(v.ok).toBe(true);
    expect(v.missing).toEqual([]);
  });

  it("blocks a fabricated number (0.55 is not in the abstract)", () => {
    const v = verifyNumbers("Rapporteret effekt: MD + 0.55 kg.", abstract);
    expect(v.ok).toBe(false);
    expect(v.missing).toContain("0.55");
  });
});

describe("gate (binary credibility gate)", () => {
  it("passes a whitelisted meta-analysis with a long abstract", () => {
    expect(gate(byId("41712097")).ok).toBe(true);
  });

  it("rejects a journal not on the whitelist", () => {
    const rec = normalize({
      id: "x1",
      title: "Some study",
      journalInfo: { journal: { title: "Predatory J", issn: "9999-9999" } },
      pubTypeList: { pubType: ["Meta-Analysis"] },
      abstractText: "x".repeat(200),
    } as EuropePmcRecord);
    const g = gate(rec);
    expect(g.ok).toBe(false);
    expect(g.reason).toMatch(/whitelist/);
  });

  it("rejects a blocked publication type (retraction)", () => {
    const rec = normalize({
      id: "x2",
      title: "Retracted study",
      journalInfo: { journal: { title: "Sports Medicine", issn: "0112-1642" } },
      pubTypeList: { pubType: ["Meta-Analysis", "Retracted Publication"] },
      abstractText: "x".repeat(200),
    } as EuropePmcRecord);
    expect(gate(rec).ok).toBe(false);
  });

  it("rejects an abstract too short to summarize credibly", () => {
    const rec = normalize({
      id: "x3",
      title: "Thin study",
      journalInfo: { journal: { title: "Sports Medicine", issn: "0112-1642" } },
      pubTypeList: { pubType: ["Meta-Analysis"] },
      abstractText: "too short",
    } as EuropePmcRecord);
    expect(gate(rec).ok).toBe(false);
  });

  it("rejects a study with no approved study type", () => {
    const rec = normalize({
      id: "x4",
      title: "Editorial piece",
      journalInfo: { journal: { title: "Sports Medicine", issn: "0112-1642" } },
      pubTypeList: { pubType: ["Journal Article"] },
      abstractText: "x".repeat(200),
    } as EuropePmcRecord);
    expect(gate(rec).ok).toBe(false);
  });
});

describe("score (hard recency + relevance bounds)", () => {
  it("zeroes recency for a study outside the window (2020 study)", () => {
    const s = score(byId("32067343"), NOW);
    expect(s.parts.recency).toBe(0);
  });

  it("keeps recency > 0 for a recent study", () => {
    const s = score(byId("41712097"), NOW);
    expect(s.parts.recency).toBeGreaterThan(0);
  });

  it("scores an off-topic fracture study below the relevance floor", () => {
    const s = score(byId("42080480"), NOW);
    expect(s.parts.relevance).toBeLessThan(0.3);
  });

  it("assigns the right domain to a creatine study (mad)", () => {
    const s = score(byId("42141930"), NOW);
    expect(s.domain).toBe("mad");
  });
});

describe("dedupe", () => {
  it("merges duplicates on DOI", () => {
    const a = byId("41712097");
    const out = dedupe([a, { ...a }]);
    expect(out).toHaveLength(1);
  });
});
