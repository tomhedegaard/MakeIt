import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DemoLoop from "./DemoLoop";

describe("DemoLoop", () => {
  const html = renderToStaticMarkup(
    <DemoLoop src="/exercise-demos/back-squat.webm" label="Back squat" pauseLabel="Pause" playLabel="Afspil" />,
  );

  it("derives webm, mp4 and poster from one URL and never autoplays from markup", () => {
    expect(html).toContain('poster="/exercise-demos/back-squat-poster.jpg"');
    expect(html).toContain('type="video/webm"');
    expect(html).toContain('type="video/mp4"');
    expect(html).not.toContain("autoplay");
    expect(html).toContain("muted");
    expect(html).toMatch(/playsinline/i); // React 19 SSR renders playsInline
  });

  it("blends into Kalk and exposes an accessible pause control", () => {
    expect(html).toContain("mix-blend-multiply");
    expect(html).toContain('aria-label="Back squat"');
    expect(html).toMatch(/<button[^>]*aria-pressed="false"[^>]*>Pause<\/button>/);
  });

  it("er uændret uden tint", () => {
    expect(html).not.toMatch(/data-tint/);
  });

  it("lægger et tokenbaseret tint-lag over klippet med tint", () => {
    const tinted = renderToStaticMarkup(
      <DemoLoop
        src="/exercise-demos/back-squat.webm"
        label="Back squat"
        pauseLabel="Pause"
        playLabel="Afspil"
        tint="body"
      />,
    );
    expect(tinted).toMatch(/data-tint="body"/);
    expect(tinted).not.toMatch(/#[0-9a-f]{6}/i);
  });
});
