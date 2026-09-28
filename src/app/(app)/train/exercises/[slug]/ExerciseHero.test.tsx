import { describe, expect, it } from "vitest";
import { render } from "@/components/marketing/test-render";
import ExerciseHero from "./ExerciseHero";

const base = {
  name: "Back squat",
  primary: ["quads" as const],
  secondary: ["glutes" as const],
  tertiary: [],
  phases: [],
  defaultView: "front" as const,
  cues: ["Brystet op"],
};

describe("ExerciseHero", () => {
  it("makes the 3D loop the hero when the exercise has one, like the landing's card", () => {
    const html = render(<ExerciseHero {...base} demoAssetUrl="/exercise-demos/back-squat.webm" />);
    expect(html).toContain("data-exercise-loop");
    expect(html).toContain('src="/exercise-demos/back-squat.webm"');
    expect(html).toContain('src="/exercise-demos/back-squat.mp4"');
    expect(html).toContain('poster="/exercise-demos/back-squat-poster.jpg"');
    expect(html).toContain('aria-label="3D-demo af Back squat, de arbejdende muskler er markeret"');
    expect(html).toMatch(/<button[^>]*aria-pressed="false"[^>]*>Afspil<\/button>/);
    // No drawn figure or its toggles next to a real render.
    expect(html).not.toContain(">Forfra<");
    expect(html).toContain("Brystet op");
    expect(html).toContain("Forlår");
  });

  // A screen reader navigates this page by heading. The section labels
  // keep their .eyebrow look but must be real <h2>s under the exercise <h1>.
  it("renders the section labels as h2 headings, not styled divs", () => {
    for (const demoAssetUrl of ["/exercise-demos/back-squat.webm", null]) {
      const html = render(<ExerciseHero {...base} demoAssetUrl={demoAssetUrl} />);
      expect(html).toContain('<h2 class="eyebrow mb-4">Sådan udfører du den</h2>');
      expect(html).toContain('<h2 class="eyebrow">Muskler involveret</h2>');
      expect(html).not.toContain('<div class="eyebrow mb-4">Sådan udfører du den</div>');
      expect(html).not.toContain('<div class="eyebrow">Muskler involveret</div>');
    }
  });

  it("falls back to the drawn figure with its toggles when there is no loop", () => {
    const html = render(<ExerciseHero {...base} demoAssetUrl={null} />);
    expect(html).not.toContain("data-exercise-loop");
    expect(html).toContain(">Forfra<");
    expect(html).toContain("Brystet op");
  });
});
