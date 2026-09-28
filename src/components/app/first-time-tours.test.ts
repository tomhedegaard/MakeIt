import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tours = {
  "FirstTimeTour.tsx": readFileSync(new URL("./FirstTimeTour.tsx", import.meta.url), "utf8"),
  "MindFirstTimeTour.tsx": readFileSync(new URL("../mind/MindFirstTimeTour.tsx", import.meta.url), "utf8"),
};

describe("first-time tours are real modals", () => {
  it.each(Object.entries(tours))("%s uses the shared Modal", (_name, src) => {
    expect(src).toMatch(/from "@\/components\/ui\/Modal"/);
    expect(src).toMatch(/<Modal[\s\S]*open=\{open\}/);
  });

  // The hand-rolled overlays claimed aria-modal without trapping focus,
  // and Escape did nothing (UX review 2026-09-19).
  it.each(Object.entries(tours))("%s no longer hand-rolls the dialog", (_name, src) => {
    expect(src).not.toMatch(/role="dialog"/);
    expect(src).not.toMatch(/aria-modal/);
  });

  it.each(Object.entries(tours))("%s still closes and remembers that it was seen", (_name, src) => {
    expect(src).toMatch(/onOpenChange=\{\(next\) => \(next \? setOpen\(true\) : dismiss\(\)\)\}/);
    expect(src).toMatch(/localStorage\.setItem/);
  });
});
