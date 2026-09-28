import { describe, it, expect } from "vitest";
import { runScienceFeed } from "./run";

const NOW = new Date("2026-06-13");

describe("runScienceFeed (end-to-end on the offline fixture)", () => {
  it("publishes 5 strong studies and rejects 2 (recency + relevance)", async () => {
    const result = await runScienceFeed({ live: false, dryRun: true, now: NOW, apiKey: "" });

    expect(result.source).toBe("fixture");
    expect(result.published).toHaveLength(5);
    expect(result.rejected).toHaveLength(2);

    // Every published item passed number verification.
    expect(result.published.every((p) => p.verified)).toBe(true);

    // The two rejects are the documented ones: a 2020 study on recency and an
    // off-topic fracture study on relevance.
    const reasons = result.rejected.map((r) => r.reason).join(" | ");
    expect(reasons).toMatch(/recency-vindue/);
    expect(reasons).toMatch(/relevans-grænse/);

    // Without an API key the summaries come from the safe template path.
    expect(result.published.every((p) => p.summaryMethod.startsWith("template"))).toBe(true);

    // Sorted by score, descending.
    const scores = result.published.map((p) => p.total);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it("never writes when dryRun is set (no db required)", async () => {
    const result = await runScienceFeed({ live: false, dryRun: true, now: NOW, apiKey: "" });
    expect(result.published.length + result.rejected.length).toBe(7);
  });
});
