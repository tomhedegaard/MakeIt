import { describe, expect, it } from "vitest";
import {
  draftCategoryCounts,
  initialQueue,
  keyToAction,
  pickReviewCategory,
  queueReducer,
  tally,
} from "./review-queue";

describe("exercise review queue", () => {
  it("moves on after approving or skipping and records the decision", () => {
    let s = queueReducer(initialQueue(), { type: "approve", id: "a" }, 3);
    s = queueReducer(s, { type: "skip", id: "b" }, 3);
    expect(s.index).toBe(2);
    expect(s.decisions).toEqual({ a: "approved", b: "skipped" });
    expect(tally(s.decisions)).toEqual({ approved: 1, skipped: 1 });
  });

  it("ends at the count, never past it, and never goes below zero", () => {
    let s = queueReducer(initialQueue(), { type: "approve", id: "a" }, 1);
    s = queueReducer(s, { type: "forward" }, 1);
    expect(s.index).toBe(1);
    s = queueReducer(queueReducer(queueReducer(s, { type: "back" }, 1), { type: "back" }, 1), { type: "back" }, 1);
    expect(s.index).toBe(0);
  });

  it("undo forgets a decision without moving", () => {
    let s = queueReducer(initialQueue(), { type: "approve", id: "a" }, 3);
    s = queueReducer(s, { type: "undo", id: "a" }, 3);
    expect(s.decisions).toEqual({});
    expect(s.index).toBe(1);
  });

  it("maps the keys", () => {
    expect(keyToAction("a")).toBe("approve");
    expect(keyToAction("Enter")).toBe("approve");
    expect(keyToAction("s")).toBe("skip");
    expect(keyToAction("ArrowRight")).toBe("skip");
    expect(keyToAction("ArrowLeft")).toBe("back");
    expect(keyToAction("x")).toBeNull();
  });
});

describe("pickReviewCategory", () => {
  it("takes the category from the query string", () => {
    expect(pickReviewCategory("mobility")).toBe("mobility");
    expect(pickReviewCategory(["cardio", "arms"])).toBe("cardio");
  });

  it("is undefined when there is none", () => {
    expect(pickReviewCategory(undefined)).toBeUndefined();
    expect(pickReviewCategory("  ")).toBeUndefined();
  });

  it("keeps a category that has no drafts left, so the queue is not remounted on the full list", () => {
    const drafts = [{ category: "cardio" }];
    const counts = draftCategoryCounts(drafts);
    expect(counts.some((c) => c.category === "mobility")).toBe(false);
    expect(pickReviewCategory("mobility")).toBe("mobility");
  });
});

describe("draftCategoryCounts", () => {
  it("counts drafts per category in taxonomy order", () => {
    const drafts = [
      { category: "cardio" },
      { category: "lower-body" },
      { category: "cardio" },
      { category: "mobility" },
    ];
    expect(draftCategoryCounts(drafts)).toEqual([
      { category: "lower-body", count: 1 },
      { category: "mobility", count: 1 },
      { category: "cardio", count: 2 },
    ]);
  });

  it("leaves drafts without a category out, and puts unknown categories last", () => {
    expect(draftCategoryCounts([{ category: null }, { category: "odd" }, { category: "arms" }])).toEqual([
      { category: "arms", count: 1 },
      { category: "odd", count: 1 },
    ]);
  });

  it("is empty for no drafts", () => {
    expect(draftCategoryCounts([])).toEqual([]);
  });
});
