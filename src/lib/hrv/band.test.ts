import { describe, expect, it } from "vitest";
import {
  bandMaturityForCount,
  buildBandRangeModel,
  buildHrvBandView,
  isOutOfBand,
  personalWindowStats,
  qualitativeFromBucket,
} from "./band";
import {
  demoBuildingSeries,
  demoEmptySeries,
  demoSteadySeries,
} from "./demo-series";

describe("band maturity", () => {
  it("maps 0 / first nights / 14+ to empty / building / steady", () => {
    expect(bandMaturityForCount(0)).toBe("empty");
    expect(bandMaturityForCount(1)).toBe("building");
    expect(bandMaturityForCount(7)).toBe("building");
    expect(bandMaturityForCount(13)).toBe("building");
    expect(bandMaturityForCount(14)).toBe("steady");
    expect(bandMaturityForCount(28)).toBe("steady");
  });
});

describe("qualitative Ro / Midt / Lav", () => {
  it("collapses the 5-bucket readiness", () => {
    expect(qualitativeFromBucket("very_high")).toBe("ro");
    expect(qualitativeFromBucket("high")).toBe("ro");
    expect(qualitativeFromBucket("normal")).toBe("midt");
    expect(qualitativeFromBucket("low")).toBe("lav");
    expect(qualitativeFromBucket("very_low")).toBe("lav");
    expect(qualitativeFromBucket(null)).toBeNull();
  });

  it("treats only normal as in-band", () => {
    expect(isOutOfBand("normal")).toBe(false);
    expect(isOutOfBand("low")).toBe(true);
    expect(isOutOfBand("high")).toBe(true);
    expect(isOutOfBand(null)).toBe(false);
  });
});

describe("buildHrvBandView", () => {
  it("empty series is a cold start — no alarm fields", () => {
    const view = buildHrvBandView(demoEmptySeries());
    expect(view.state).toBe("empty");
    expect(view.latestMs).toBeNull();
    expect(view.qualitative).toBeNull();
    expect(view.outOfBand).toBe(false);
    expect(view.engineCue).toBeNull();
  });

  it("building series keeps 7-night copy inputs and no engine cue", () => {
    const view = buildHrvBandView(demoBuildingSeries());
    expect(view.state).toBe("building");
    expect(view.nightsCollected).toBe(4);
    expect(view.nightsNeeded).toBe(7);
    expect(view.latestMs).toBeGreaterThan(0);
    expect(view.qualitative).toBeNull();
    expect(view.engineCue).toBeNull();
    expect(personalWindowStats(demoBuildingSeries())).toBeNull();
  });

  it("steady demo fixture is out of band (Lav) with a Heart→Body cue", () => {
    const view = buildHrvBandView(demoSteadySeries());
    expect(view.state).toBe("steady");
    expect(view.nightsCollected).toBe(21);
    expect(view.avgMs).not.toBeNull();
    expect(view.bandLowMs).not.toBeNull();
    expect(view.bandHighMs).not.toBeNull();
    expect(view.qualitative).toBe("lav");
    expect(view.outOfBand).toBe(true);
    expect(view.engineCue).toBe("below");
  });
});

describe("buildBandRangeModel", () => {
  it("omits band / avg / mark while building", () => {
    const range = buildBandRangeModel(buildHrvBandView(demoBuildingSeries()));
    expect(range.band).toBeNull();
    expect(range.avgX).toBeNull();
    expect(range.markX).toBeNull();
  });

  it("places today's mark and a dashed avg inside a steady band", () => {
    const range = buildBandRangeModel(buildHrvBandView(demoSteadySeries()));
    expect(range.band).not.toBeNull();
    expect(range.band!.width).toBeGreaterThan(2);
    expect(range.avgX).not.toBeNull();
    expect(range.markX).not.toBeNull();
    expect(range.avgX).toBeGreaterThan(range.trackX1);
    expect(range.avgX).toBeLessThan(range.trackX2);
  });
});
