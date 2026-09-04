import { describe, expect, it } from "vitest";
import {
  FORM_QUEUE_TYPE,
  createFormQueueItem,
  demoFormQueueItems,
  formCheckReadableByEngine,
  liftLabel,
  markFormQueueReviewed,
  pendingFormQueue,
  threadsForLift,
} from "./queue";

const NOW = new Date("2026-09-03T08:00:00.000Z");

describe("form-queue", () => {
  it("creates a set-scoped form_check with athlete + lift, pending", () => {
    const item = createFormQueueItem(
      {
        memberId: "m-nina",
        memberHandle: "nina_dl",
        exerciseName: "Back Squat",
        setIndex: 4,
        sessionId: "sess-2026-05-05",
      },
      NOW,
    );

    expect(item.type).toBe(FORM_QUEUE_TYPE);
    expect(item.type).toBe("form_check");
    expect(item.memberHandle).toBe("nina_dl");
    expect(item.exerciseName).toBe("Back Squat");
    expect(item.setIndex).toBe(4);
    expect(item.status).toBe("pending");
    expect(item.reviewedAt).toBeNull();
    expect(liftLabel(item)).toBe("Back Squat · sæt 4");
  });

  it("does not let the engine read pending films", () => {
    const pending = createFormQueueItem(
      {
        memberId: "m-1",
        memberHandle: "a",
        exerciseName: "RDL",
        setIndex: 1,
      },
      NOW,
    );
    expect(formCheckReadableByEngine(pending)).toBe(false);
    expect(formCheckReadableByEngine({ status: "pending", reviewedAt: null })).toBe(
      false,
    );
  });

  it("lets the engine read reviewed_at only when status=reviewed", () => {
    const pending = createFormQueueItem(
      {
        memberId: "m-1",
        memberHandle: "a",
        exerciseName: "RDL",
        setIndex: 1,
      },
      NOW,
    );
    const reviewed = markFormQueueReviewed(pending, {
      notes: "Hofte tilbage.",
      voiceNoteUrl: "demo:voice",
      voiceNoteDurationSec: 12,
      reviewedAt: "2026-09-03T09:00:00.000Z",
    });

    expect(reviewed.status).toBe("reviewed");
    expect(reviewed.reviewedAt).toBe("2026-09-03T09:00:00.000Z");
    expect(reviewed.voiceNoteUrl).toBe("demo:voice");
    expect(formCheckReadableByEngine(reviewed)).toBe(true);
    expect(
      formCheckReadableByEngine({
        status: "pending",
        reviewedAt: "2026-09-03T09:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      formCheckReadableByEngine({ status: "reviewed", reviewedAt: null }),
    ).toBe(false);
  });

  it("demo fixtures include a pending film and a reviewed voice example", () => {
    const items = demoFormQueueItems(NOW);
    const pending = pendingFormQueue(items);
    const reviewed = items.filter((i) => i.status === "reviewed");

    expect(pending.length).toBeGreaterThanOrEqual(1);
    expect(reviewed.length).toBeGreaterThanOrEqual(1);
    expect(pending.every((i) => i.type === "form_check")).toBe(true);
    expect(reviewed[0]?.voiceNoteUrl).toBe("demo:voice");
    expect(formCheckReadableByEngine(reviewed[0]!)).toBe(true);

    const squatThread = threadsForLift(items, "Back Squat");
    expect(squatThread.some((i) => i.status === "reviewed")).toBe(true);
    expect(squatThread.every((i) => i.exerciseName === "Back Squat")).toBe(true);
  });
});
