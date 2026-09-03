import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HrvBandHero, { type HrvBandCopy } from "./HrvBandHero";
import { buildHrvBandView } from "@/lib/hrv/band";
import {
  demoBuildingSeries,
  demoEmptySeries,
  demoSteadySeries,
} from "@/lib/hrv/demo-series";

const COPY: HrvBandCopy = {
  eyebrow: "Hjerte",
  latest: "HRV i morges",
  unit: "ms",
  avg: "Dit snit",
  qualitative: { ro: "Ro", midt: "Midt", lav: "Lav" },
  emptyTitle: "Dit bånd venter på de første nætter",
  emptyBody: "Ingen alarm — bare et tomt spor.",
  buildingTitle: "Bygger dit bånd",
  buildingBody: "7 nætter bygger dit personlige bånd.",
  buildingNights: "4 af 7 nætter",
  steadyEyebrow: "Dit normalområde",
  engineBelow: "Motoren letter dagens squat-topsæt.",
  engineAbove: "kroppen er klar",
  disclaimer: "HRV er et restitutions-signal — ikke en diagnose.",
  legendBand: "Dit bånd",
  legendAvg: "Dit snit",
  rangeLabel: "Personligt normalområde",
};

function render(series: ReturnType<typeof demoSteadySeries>) {
  return renderToStaticMarkup(
    createElement(HrvBandHero, {
      view: buildHrvBandView(series),
      copy: COPY,
    }),
  );
}

describe("HrvBandHero states", () => {
  it("empty is a cold start, not a red-alarm screen", () => {
    const html = render(demoEmptySeries());
    expect(html).toContain('data-hrv-band="empty"');
    expect(html).toContain("Dit bånd venter på de første nætter");
    expect(html).toContain("Ingen alarm");
    expect(html).toContain("ikke en diagnose");
    expect(html).not.toContain("data-engine-cue");
    expect(html).not.toContain("text-danger");
    expect(html).not.toContain("bg-danger");
  });

  it("building shows the large value and 7-night copy without a cue", () => {
    const html = render(demoBuildingSeries());
    expect(html).toContain('data-hrv-band="building"');
    expect(html).toContain("7 nætter");
    expect(html).toContain("4 af 7 nætter");
    expect(html).not.toContain("data-qualitative");
    expect(html).not.toContain("data-engine-cue");
  });

  it("steady shows Lav, the personal band, dashed avg and the engine sentence", () => {
    const html = render(demoSteadySeries());
    expect(html).toContain('data-hrv-band="steady"');
    expect(html).toContain('data-qualitative="lav"');
    expect(html).toContain(">Lav<");
    expect(html).toContain("data-hrv-band-range");
    expect(html).toContain('stroke-dasharray="3 3"');
    expect(html).toContain('data-engine-cue="below"');
    expect(html).toContain("Motoren letter dagens squat-topsæt.");
    expect(html).toContain("ikke en diagnose");
  });
});
