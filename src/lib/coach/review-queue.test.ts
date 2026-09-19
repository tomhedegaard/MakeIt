import { describe, expect, it } from "vitest";
import { initialQueue, keyToAction, queueReducer, tally } from "./review-queue";

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
