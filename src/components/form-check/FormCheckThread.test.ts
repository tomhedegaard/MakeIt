import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import FormCheckThread, { type FormCheckThreadCopy } from "./FormCheckThread";
import { demoFormQueueItems, threadsForLift } from "@/lib/form-queue/queue";

const COPY: FormCheckThreadCopy = {
  eyebrow: "Tråd under løftet",
  pending: "Afventer Munk",
  reviewed: "Munk har svaret",
  voice: "Lydbesked",
  youFilmed: "Du filmede dette sæt",
  munkReply: "Svar fra Munk",
};

describe("FormCheckThread", () => {
  it("shows pending + reviewed items for a lift, with Munk voice on reviewed", () => {
    const items = threadsForLift(demoFormQueueItems(new Date("2026-09-03")), "Back Squat");
    const html = renderToStaticMarkup(
      createElement(FormCheckThread, { items, copy: COPY }),
    );
    expect(html).toContain("data-form-thread");
    expect(html).toContain('data-queue-type="form_check"');
    expect(html).toContain("Back Squat");
    expect(html).toContain("data-munk-mark");
    expect(html).toContain("data-munk-voice");
    expect(html).toContain("Lydbesked");
    expect(html).toContain("Afventer Munk");
  });
});
