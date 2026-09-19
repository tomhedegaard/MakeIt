/**
 * The exercise review queue as pure state: which draft is on screen and
 * what the coach decided for each one. The component owns the server
 * calls; this only decides what the screen shows next.
 */

export type Decision = "approved" | "skipped";

export type QueueState = {
  index: number;
  decisions: Record<string, Decision>;
};

export type QueueAction =
  | { type: "approve"; id: string }
  | { type: "skip"; id: string }
  | { type: "undo"; id: string }
  | { type: "back" }
  | { type: "forward" };

export function initialQueue(): QueueState {
  return { index: 0, decisions: {} };
}

/** `count` is the number of drafts in the queue; `index === count` means done. */
export function queueReducer(state: QueueState, action: QueueAction, count: number): QueueState {
  switch (action.type) {
    case "approve":
    case "skip":
      return {
        index: Math.min(state.index + 1, count),
        decisions: { ...state.decisions, [action.id]: action.type === "approve" ? "approved" : "skipped" },
      };
    case "undo": {
      const decisions = { ...state.decisions };
      delete decisions[action.id];
      return { ...state, decisions };
    }
    case "back":
      return { ...state, index: Math.max(state.index - 1, 0) };
    case "forward":
      return { ...state, index: Math.min(state.index + 1, count) };
  }
}

/** Keyboard: A or Enter approves, S or → skips, ← goes back. */
export function keyToAction(key: string): "approve" | "skip" | "back" | null {
  if (key === "a" || key === "A" || key === "Enter") return "approve";
  if (key === "s" || key === "S" || key === "ArrowRight") return "skip";
  if (key === "ArrowLeft") return "back";
  return null;
}

export function tally(decisions: Record<string, Decision>) {
  let approved = 0;
  let skipped = 0;
  for (const d of Object.values(decisions)) {
    if (d === "approved") approved += 1;
    else skipped += 1;
  }
  return { approved, skipped };
}
