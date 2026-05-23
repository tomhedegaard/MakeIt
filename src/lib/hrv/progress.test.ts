import { describe, it, expect } from "vitest";
import {
  deriveSyncProgress,
  type DeriveSyncProgressInput,
  type HrvSyncProgress,
} from "./progress";

function input(
  over: Partial<DeriveSyncProgressInput> = {},
): DeriveSyncProgressInput {
  return {
    daysSynced: 0,
    paidMilestones: [],
    latestUnseen: null,
    ...over,
  };
}

describe("deriveSyncProgress", () => {
  it("returns empty progress when daysSynced=0", () => {
    expect(deriveSyncProgress(input())).toEqual<HrvSyncProgress>({
      daysSynced: 0,
      nextMilestone: 7,
      nextMilestoneReps: 50,
      unseenMilestone: null,
    });
  });

  it("returns nextMilestone=7 when below 7 with no paid milestones", () => {
    expect(deriveSyncProgress(input({ daysSynced: 5 })).nextMilestone).toBe(7);
    expect(
      deriveSyncProgress(input({ daysSynced: 5 })).nextMilestoneReps,
    ).toBe(50);
  });

  it("returns nextMilestone=14 when 7 is paid", () => {
    expect(
      deriveSyncProgress(input({ daysSynced: 12, paidMilestones: [7] }))
        .nextMilestone,
    ).toBe(14);
  });

  it("returns nextMilestone=30 when 7 and 14 are paid", () => {
    expect(
      deriveSyncProgress(
        input({ daysSynced: 22, paidMilestones: [7, 14] }),
      ).nextMilestone,
    ).toBe(30);
  });

  it("returns nextMilestone=90 when 7, 14, 30 are paid", () => {
    expect(
      deriveSyncProgress(
        input({ daysSynced: 60, paidMilestones: [7, 14, 30] }),
      ).nextMilestone,
    ).toBe(90);
  });

  it("returns nextMilestone=null when all four milestones paid", () => {
    expect(
      deriveSyncProgress(
        input({
          daysSynced: 117,
          paidMilestones: [7, 14, 30, 90],
        }),
      ),
    ).toEqual<HrvSyncProgress>({
      daysSynced: 117,
      nextMilestone: null,
      nextMilestoneReps: null,
      unseenMilestone: null,
    });
  });

  it("nextMilestoneReps is the canonical payout for the nextMilestone", () => {
    // 7→50, 14→100, 30→200, 90→500.
    expect(
      deriveSyncProgress(input({ daysSynced: 0 })).nextMilestoneReps,
    ).toBe(50);
    expect(
      deriveSyncProgress(input({ daysSynced: 8, paidMilestones: [7] }))
        .nextMilestoneReps,
    ).toBe(100);
    expect(
      deriveSyncProgress(input({ daysSynced: 25, paidMilestones: [7, 14] }))
        .nextMilestoneReps,
    ).toBe(200);
    expect(
      deriveSyncProgress(
        input({ daysSynced: 75, paidMilestones: [7, 14, 30] }),
      ).nextMilestoneReps,
    ).toBe(500);
  });

  it("surfaces latestUnseen verbatim", () => {
    const result = deriveSyncProgress(
      input({
        daysSynced: 30,
        paidMilestones: [7, 14, 30],
        latestUnseen: { milestone: 30, reps: 200 },
      }),
    );
    expect(result.unseenMilestone).toEqual({ milestone: 30, reps: 200 });
  });

  it("unseenMilestone is null when no row was unseen", () => {
    const result = deriveSyncProgress(
      input({ daysSynced: 30, paidMilestones: [7, 14, 30] }),
    );
    expect(result.unseenMilestone).toBeNull();
  });

  it("paidMilestones order does not matter", () => {
    expect(
      deriveSyncProgress(
        input({ daysSynced: 22, paidMilestones: [14, 7] }),
      ).nextMilestone,
    ).toBe(30);
  });
});
