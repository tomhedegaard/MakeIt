import { describe, expect, it } from "vitest";
import { render } from "../test-render";
import ChapterTrain from "./ChapterTrain";
import ChapterFood from "./ChapterFood";
import ChapterHeart from "./ChapterHeart";
import ChapterMind from "./ChapterMind";
import CrewAlone from "./CrewAlone";

describe("landing chapters", () => {
  it("each chapter is an anchored section with its own heading", () => {
    for (const [El, id] of [[ChapterTrain, "train"], [ChapterFood, "food"], [ChapterHeart, "hrv"], [ChapterMind, "mind"], [CrewAlone, "crew-alone"]] as const) {
      const html = render(<El />);
      expect(html).toMatch(new RegExp(`<section id="${id}"[^>]*aria-labelledby="([^"]+)"`));
      expect(html).toMatch(/<h2 id="[^"]+"/);
    }
  });

  it("training shows one moving demo and eight stills", () => {
    const html = render(<ChapterTrain />);
    expect(html.match(/<source src="[^"]+\.webm"/g)).toHaveLength(1);
    expect(html.match(/-poster\.jpg"/g)?.length).toBeGreaterThanOrEqual(8);
  });

  it("food shows seven photographed plates and credits every photographer", () => {
    const html = render(<ChapterFood />);
    expect(html.match(/<img[^>]+images\.unsplash\.com/g)).toHaveLength(7);
    expect(html).toContain("Fotos fra Unsplash:");
    expect(html.match(/href="https:\/\/unsplash\.com\/@/g)).toHaveLength(7);
  });

  it("HRV names the four devices and is a dark block", () => {
    const html = render(<ChapterHeart />);
    expect(html).toMatch(/<section id="hrv"[^>]*data-theme="nat"/);
    for (const d of ["WHOOP", "Oura", "Polar", "Apple Watch"]) expect(html).toContain(`>${d}</li>`);
  });
});
