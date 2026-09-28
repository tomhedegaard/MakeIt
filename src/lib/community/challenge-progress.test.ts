import { describe, expect, it } from "vitest";
import { communityChallengeProgress } from "./challenge-progress";

describe("communityChallengeProgress", () => {
  it("keeps the demo 68.4 / 100K fixture", () => {
    const demo = communityChallengeProgress("demo");
    expect(demo.currentLabel).toBe("68.4 / 100K");
    expect(demo.barPercent).toBe(68.4);
    expect(demo.youPercent).toBe(68);
    expect(demo.participantCount).toBe(128);
    expect(demo.enrolled).toBe(true);
  });

  it("does not hardcode fake 68.4 / 100K in connected mode", () => {
    const live = communityChallengeProgress("connected");
    expect(live.currentLabel).toBe("0 / 100K");
    expect(live.barPercent).toBe(0);
    expect(live.youPercent).toBe(0);
    expect(live.participantCount).toBe(0);
    expect(live.enrolled).toBe(false);
    expect(live.currentLabel).not.toContain("68.4");
    expect(live.barPercent).not.toBe(68.4);
  });
});
