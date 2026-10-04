import { describe, expect, it } from "vitest";
import { communityChallengeProgress } from "./challenge-progress";

describe("communityChallengeProgress", () => {
  it("keeps the demo 68.4 / 100K fixture", () => {
    const demo = communityChallengeProgress("demo");
    expect(demo.currentK).toBe(68.4);
    expect(demo.barPercent).toBe(68.4);
    expect(demo.youPercent).toBe(68);
    expect(demo.participantCount).toBe(128);
    expect(demo.enrolled).toBe(true);
  });

  it("does not hardcode fake 68.4 / 100K in connected mode", () => {
    const live = communityChallengeProgress("connected");
    expect(live.currentK).toBe(0);
    expect(live.barPercent).toBe(0);
    expect(live.youPercent).toBe(0);
    expect(live.participantCount).toBe(0);
    expect(live.enrolled).toBe(false);
    expect(live.barPercent).not.toBe(68.4);
  });
});
