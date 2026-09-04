import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AdaptiveReasonStrip, {
  type AdaptiveStripCopy,
} from "./AdaptiveReasonStrip";
import { demoEngineStrip, emptyEngineStrip } from "@/lib/adaptive/engine-strip";

const COPY: AdaptiveStripCopy = {
  why: "Hvorfor",
  attribution: "Motor · Adaptive Engine",
  munkNoteLabel: "Note fra Munk",
  steps: {
    hrvLow: "Hjerte — nattens HRV ligger under dit bånd",
    hrvVeryLow: "very",
    hrvInBand: "in",
    sessionToday: "Krop — dagens pas",
    lowSleep: "sleep",
    alcohol: "alc",
    lowFeeling: "træt",
    rpeOvershoot: "rpe",
    rpeDrift: "drift",
    mentalLoad: "load",
    formCheck: "form",
    missed: "missed",
    noAlcohol: "ingen alkohol",
    mindUnread: "mind",
  },
};

describe("AdaptiveReasonStrip", () => {
  it("renders collapsed by default with 3–6 named steps and no face", () => {
    const html = renderToStaticMarkup(
      createElement(AdaptiveReasonStrip, {
        model: demoEngineStrip(),
        copy: COPY,
      }),
    );
    expect(html).toContain("data-engine-strip");
    expect(html).toContain("<details");
    expect(html).not.toMatch(/<details[^>]*\sopen[\s>]/);
    expect(html).toContain("Hvorfor");
    expect(html).toContain("Motor · Adaptive Engine");
    expect(html).toContain("data-motor-glyph");
    expect(html).toContain("data-engine-steps");
    expect(html.match(/data-strip-step=/g)?.length).toBe(5);
    expect(html).toContain("data-strip-domain=\"heart\"");
    expect(html).toContain("data-strip-domain=\"body\"");
    expect(html).not.toContain("data-munk-note");
    expect(html).not.toContain("token");
    expect(html).not.toContain("sparkle");
    expect(html.toLowerCase()).not.toContain("smiley");
  });

  it("renders nothing when the strip has no steps", () => {
    const html = renderToStaticMarkup(
      createElement(AdaptiveReasonStrip, {
        model: emptyEngineStrip(),
        copy: COPY,
      }),
    );
    expect(html).toBe("");
  });

  it("surfaces an optional Munk note when provided", () => {
    const html = renderToStaticMarkup(
      createElement(AdaptiveReasonStrip, {
        model: { ...demoEngineStrip(), munkNote: "Kør tilpasset." },
        copy: COPY,
      }),
    );
    expect(html).toContain("data-munk-note");
    expect(html).toContain("data-munk-mark");
    expect(html).toContain("Kør tilpasset.");
    expect(html).toContain("data-motor-glyph");
  });
});
