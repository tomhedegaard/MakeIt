import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SessionExerciseDemo from "./SessionExerciseDemo";

describe("SessionExerciseDemo", () => {
  it("plays the 9:16 cut in its 9:16 frame, with the landscape pair as fallback", () => {
    const html = renderToStaticMarkup(
      <SessionExerciseDemo demoAssetUrl="/exercise-demos/row.webm" phases={[]} label="Row" playLabel="Afspil" pauseLabel="Pause" eyebrow="Demo" />,
    );
    const sources = [...html.matchAll(/<source src="([^"]+)"/g)].map((m) => m[1]);
    expect(sources).toEqual([
      "/exercise-demos/row-portrait.webm",
      "/exercise-demos/row-portrait.mp4",
      "/exercise-demos/row.webm",
      "/exercise-demos/row.mp4",
    ]);
    expect(html).toContain('poster="/exercise-demos/row-portrait-poster.jpg"');
  });

  it("never autoplays from markup and always renders a 44 px play/pause toggle", () => {
    const html = renderToStaticMarkup(
      <SessionExerciseDemo demoAssetUrl="/exercise-demos/row.webm" phases={[]} label="Row" playLabel="Afspil" pauseLabel="Pause" eyebrow="Demo" />,
    );
    // Playback starts in an effect that checks prefers-reduced-motion first.
    expect(html).not.toMatch(/autoplay/i);
    expect(html).toMatch(/<button[^>]*data-session-demo-toggle=""[^>]*aria-label="Afspil"[^>]*class="[^"]*size-11/);
  });
});
