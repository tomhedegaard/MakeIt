import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ConnectDotsStream, { type DotsCopy } from "./ConnectDotsStream";
import { demoInsightStream } from "@/lib/dashboard/insight-stream";

const COPY: DotsCopy = {
  eyebrow: "I dag",
  title: "Sammenhængene",
  moreAbout: "Sig mere om",
  dismiss: "Skjul",
  snooze: "I morgen",
  domains: { heart: "Hjerte", body: "Krop", food: "Kost", mind: "Sind" },
  cards: {
    heart_body_low: {
      sentence: "Nattens HRV ligger under dit bånd — Motoren letter dagens squat-topsæt.",
      cta: "Åbn dagens pas",
    },
    heart_body_ro: { sentence: "ro", cta: "cta" },
    heart_mind_tired: { sentence: "mind", cta: "cta" },
    body_food_session: { sentence: "food", cta: "cta" },
    mind_body_check: { sentence: "check", cta: "cta" },
  },
};

describe("ConnectDotsStream card grammar", () => {
  it("renders domain badges, a linking sentence, a CTA and a more-chip", () => {
    const cards = demoInsightStream("/session/sess-2026-05-05");
    const html = renderToStaticMarkup(
      createElement(ConnectDotsStream, { cards, copy: COPY }),
    );
    expect(html).toContain("data-adapt-dots");
    expect(html).toContain('data-insight-card="heart_body_low"');
    expect(html).toContain('data-insight-domains="heart body"');
    expect(html).toContain("Nattens HRV ligger under dit bånd");
    expect(html).toContain("Åbn dagens pas");
    expect(html).toContain("Sig mere om");
    expect(html).toContain('data-more-about="heart"');
    expect(html).toContain("/hrv/trends#band");
    expect(html).toContain("/session/sess-2026-05-05");
  });
});
