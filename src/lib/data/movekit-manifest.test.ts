import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { batchClips, unassigned, validateManifest } from "../../../scripts/lib/movekit.mjs";

type Clip = { clip: string; core: string[]; library: string | null; skipped: string | null; highlight: boolean };

const read = (p: string) => JSON.parse(readFileSync(join(process.cwd(), p), "utf8"));
const manifest: { clips: Clip[] } = read("scripts/movekit-manifest.json");
const map = read("scripts/movekit-map.json");

describe("movekit-manifest.json", () => {
  it("holds every ledger rule", () => {
    expect(validateManifest(manifest, map)).toEqual([]);
  });

  it("leaves no clip unassigned", () => {
    expect(unassigned(manifest)).toEqual([]);
  });

  it("has 577 clips: two library batches, the core sources and two skipped duplicates", () => {
    expect(manifest.clips).toHaveLength(577);
    expect(batchClips(manifest, "2026-06")).toHaveLength(188);
    expect(batchClips(manifest, "2026-10")).toHaveLength(369);
    expect(manifest.clips.filter((c) => c.skipped).map((c) => c.clip)).toEqual([
      "open-book-rotations",
      "wide-push-ups",
    ]);
  });

  it("feeds all 20 core exercises, front-squat included", () => {
    const fed = manifest.clips.flatMap((c) => c.core).sort();
    expect(fed).toHaveLength(20);
    expect(new Set(fed).size).toBe(20);
    expect(fed).toContain("front-squat");
  });

  it("gives every core exercise a source with red muscle highlight", () => {
    const dark = manifest.clips.filter((c) => c.core.length > 0 && !c.highlight).flatMap((c) => c.core);
    expect(dark).toEqual([]);
  });

  it("puts the two freed proxy clips in the new batch", () => {
    const batch = batchClips(manifest, "2026-10");
    expect(batch).toContain("barbell-stiff-leg-deadlifts");
    expect(batch).toContain("kettlebell-hip-thrust");
    expect(batch).not.toContain("front-squat");
    expect(batch).not.toContain("barbell-romanian-deadlift");
  });
});
