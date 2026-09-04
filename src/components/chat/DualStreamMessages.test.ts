import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DualStreamMessages, {
  type DualStreamCopy,
} from "./DualStreamMessages";
import { demoDualStream } from "@/lib/data/message-streams";
import { demoEngineStrip } from "@/lib/adaptive/engine-strip";

const COPY: DualStreamCopy = {
  munkTitle: "Munk",
  munkSub: "Menneskelig craft",
  motorTitle: "Motor · Adaptive Engine",
  motorSub: "Ingen ansigt",
  propose: "@foreslår",
  voice: "Lydbesked",
};

const STRIP_COPY = {
  why: "Hvorfor",
  attribution: "Motor · Adaptive Engine",
  munkNoteLabel: "Note fra Munk",
  steps: {
    hrvLow: "hrv",
    hrvVeryLow: "v",
    hrvInBand: "in",
    sessionToday: "s",
    lowSleep: "sl",
    alcohol: "a",
    lowFeeling: "f",
    rpeOvershoot: "r",
    rpeDrift: "d",
    mentalLoad: "m",
    formCheck: "fc",
    missed: "mi",
    noAlcohol: "na",
    mindUnread: "mu",
  },
};

describe("DualStreamMessages", () => {
  it("keeps Munk and Motor as two streams with distinct chrome", () => {
    const { munk, motor } = demoDualStream(new Date("2026-09-03"));
    const html = renderToStaticMarkup(
      createElement(DualStreamMessages, {
        munk,
        motor,
        copy: COPY,
        strip: demoEngineStrip(),
        stripCopy: STRIP_COPY,
      }),
    );

    expect(html).toContain("data-dual-stream");
    expect(html).toContain('data-stream="munk"');
    expect(html).toContain('data-stream="motor"');
    expect(html).toContain("data-munk-mark");
    expect(html).toContain("data-motor-glyph");
    expect(html).toContain('data-stream-bubble="munk"');
    expect(html).toContain('data-stream-bubble="motor"');
    expect(html).toContain('data-propose="true"');
    expect(html).toContain("@foreslår");
    expect(html).toContain("data-engine-strip");
    expect(html).toContain("Lydbesked");
    expect(html.toLowerCase()).not.toContain("sparkle");
  });
});
